import { getAllChannels } from '@/api/slack/channel';
import { retrieveAllUser } from '@/api/user';
import { aggregateUniqItemsReactedByMembers } from '@/lib/aggregator';
import { checkEmojiUniqueness } from '@/lib/emoji';
import { Log } from '@/lib/log';
import { invalidOptionText } from '@/lib/messages';
import { parseOptions } from '@/lib/parser';
import { CliExecFn } from '@/types';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import arg from 'arg';
import groupBy from 'just-group-by';
import { buildSheetMembersReacted } from './utils/build-sheet';
import { parseReactions } from './utils/reactions-parser';

const helpText = `
\`\`\`
Command:
  aggregate:members-reacted  指定された期間内に指定されたリアクションを行った回数をユーザー毎に集計して5位までをリストアップする

Usage:
  slack-cli aggregate:members-reacted [options]

Options:
  --channel-id      投稿先チャンネルID。slash-command 以外では --channel-id or --channel-name が必須。
  --channel-name    投稿先チャンネル名。slash-command 以外では --channel-id or --channel-name が必須。
  --start-date      集計対象の期間の開始日時。指定例: '2022-12-01' 指定がない場合は実行日時の 1ヶ月前となる。
  --end-date        集計対象の期間の終了日時。指定例: '2022-12-01' 指定がない場合は実行日時となる。
  --reactions       集計対象のリアクション文字列。カンマ区切りで複数指定が可能。
                    []で括ると集計を一つにまとめることができる。デフォルト '+1,pray'
                    例）--reactions '+1,[pray,joy],heart' と指定した場合、pray と joy は集計を一つにまとめることができる
  --dry-run         投稿はせずに投稿内容をログ出力する
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false
  --no-mention      投稿時にメンションしない場合にのみ指定する
  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--start-date': String,
        '--end-date': String,
        '--channel-name': String,
        '--channel-id': String,
        '--reactions': String,
        '--dry-run': Boolean,
        '--as-user': Boolean,
        '--no-mention': Boolean,
        '--help': Boolean,
        '--debug': Boolean,

        // Alias
        '-h': '--help',
      },
      { argv }
    );
  } catch (e: any) {
    if (e.code === 'ARG_UNKNOWN_OPTION') {
      Log.error(invalidOptionText);
    } else {
      Log.error(e);
    }
    Log.error(helpText);
    return null;
  }
}

interface MemberDictionary {
  [id: string]: number;
}

interface ReactionDictionary {
  [id: string]: MemberDictionary;
}

export const exec: CliExecFn = async (argv, progress) => {
  const args = parseArgs(argv);
  if (args === null) return { error: invalidOptionText + '\n' + helpText };

  if (args['--help']) {
    return { text: helpText };
  }
  checkEmojiUniqueness();

  const options = parseOptions(args);
  // dry-run でないなら投稿先チャンネルは必須
  let channel: Channel | undefined;
  if (!options.dryRun) {
    channel = (await getAllChannels({ types: 'public_channel' }, options)).find(
      (c) => c.id === args['--channel-id'] || c.name === args['--channel-name']
    );
    if (!channel) {
      Log.error('投稿先チャンネルを指定してください。');
      return;
    }
  }

  const targetItems =
    (await aggregateUniqItemsReactedByMembers(options, progress)) || [];
  const { targetReactions, singleReactions, categorizedReactions } =
    await parseReactions(args['--reactions']);
  const sortedOutputOrder = args['--reactions']
    .replace(/\[([^\]]+)\]/g, (_, p1) => p1.split(',').join('::'))
    .split(',');

  const users = await retrieveAllUser(options);

  // uniq items からユーザー毎のターゲットリアクションを集計する
  // 投稿者のIDと得られたリアクションの辞書
  const skinToneRegex = /::skin-tone-\d/;
  const reactionNameToReactedMemberDict: ReactionDictionary = {};
  for (const reaction of targetReactions) {
    reactionNameToReactedMemberDict[reaction] = {};
  }

  for (const item of targetItems) {
    // 投稿者がユーザー一覧に含まれていないなら集計しない
    if (!users.some((u) => u.id === item.message?.user)) continue;
    // 集計対象を整形
    const reactions =
      item.message?.reactions?.map((r) => ({
        count: r.count || 0,
        name: (r.name || '').replace(skinToneRegex, ''),
        users: r.users || [],
      })) || [];
    // targetReaction を含まない投稿を弾く
    if (!reactions.some((r) => targetReactions.includes(r.name))) continue;

    for (const reaction of reactions) {
      if (!targetReactions.includes(reaction.name)) continue;
      const rDict = reactionNameToReactedMemberDict[reaction.name];
      // リアクションをつけたユーザーの内、集計対象者だけ集計
      for (const user of reaction.users.filter((uid) =>
        users.some((u) => u.id === uid)
      )) {
        // 自身の投稿へのリアクションなら集計しない
        if (item.message?.user === user) continue;
        rDict[user] = (rDict[user] ?? 0) + 1;
      }
    }
  }

  let url: string | undefined;
  if (process.env.GOOGLE_SPREADSHEET_ID && !options.dryRun) {
    url = await buildSheetMembersReacted(
      {
        sheetId: process.env.GOOGLE_SPREADSHEET_ID,
        command: `aggregate:members-reacted ${(argv ?? []).join(' ')}`,
        dict: reactionNameToReactedMemberDict,
      },
      options
    );
  }

  if (categorizedReactions.length > 0) {
    for (const reactionNames of categorizedReactions) {
      // 後で表示する際にそのまま使える形で key にする
      // そのため、最初と最後の : が不要（ aa::bb::cc となる）
      // NOTE: 出力時のソートで同じロジックを別で行っているので注意
      const key = reactionNames
        .map((r, i) => `${i !== 0 ? ':' : ''}${r}`)
        .join(':');
      const categorizedValue: MemberDictionary = {};
      reactionNameToReactedMemberDict[key] = categorizedValue;

      for (const midToCount of reactionNames.map(
        (name) => reactionNameToReactedMemberDict[name]
      )) {
        // 全メンバーのまとめる対象の count を合計する
        for (const [mid, count] of Object.entries(midToCount)) {
          categorizedValue[mid] = count + (categorizedValue[mid] ?? 0);
        }
      }
    }
    // single で指定されていないものを削除する
    targetReactions
      .filter((r) => !singleReactions.includes(r))
      .forEach((r) => delete reactionNameToReactedMemberDict[r]);
  }

  const blocks: string[] = [];
  for (const [rid, dict] of Object.entries(
    reactionNameToReactedMemberDict
  ).sort(
    (a, b) => sortedOutputOrder.indexOf(a[0]) - sortedOutputOrder.indexOf(b[0])
  )) {
    const candidates = groupBy(Object.entries(dict), ([mid, count]) => count);
    if (Object.keys(candidates).length === 0) {
      blocks.push(`:${rid}: をリアクションした人はいませんでした。`);
      continue;
    }

    // 獲得数が一番多い順に 5位まで、もしくは同列順位を含めて 5人以上になるようにリストアップする
    const list: { rid: string; mid: string; count: number; rank: number }[] =
      [];
    for (const [index, value] of Object.entries(candidates).reverse()) {
      if (list.length >= 5) break;
      list.push(
        ...Object.entries(value).map(([_, v]) => ({
          rid,
          mid: v[0],
          count: v[1],
          rank: list.length + 1,
        }))
      );
    }
    const text = `最も :${rid}: をリアクションしたトップ${
      list.length
    }は、この人たちです！\n${list
      .map(({ mid, count, rank }) => {
        const member = users.find((m) => m.id === mid);
        return `${rank}. ${member?.real_name ?? member?.name}${
          options.noMention ? '' : `(<@${mid}>)`
        } (${count})`;
      })
      .join('\n')}`;
    blocks.push(text);
  }
  if (url) blocks.push(`\n<${url}|全ての集計結果はこちら>`);

  if (args['--dry-run']) {
    Log.success(blocks);
    return;
  }
  Log.debug(blocks);
  return {
    asUser: !options.asBot,
    postArg: {
      channel: channel!.id!,
      text: '',
      blocks: [
        `${options.startDate?.toLocaleDateString() ?? '未設定'}~${
          options.endDate?.toLocaleDateString() ?? '現在'
        }の期間で最もリアクションを行った人を発表します🎉`,
        ...blocks,
      ].flatMap((b) => [
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: b,
          },
        },
      ]),
    },
  };
};
