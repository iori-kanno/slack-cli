import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { retrieveAllUser } from '../../api/user';
import { getAllChannels } from '../../api/slack/channel';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import groupBy from 'just-group-by';
import { aggregateUniqItemsReactedByMembers } from '../../lib/aggregator';
import { parseOptions } from '../../lib/parser';
import { parseReactions } from './utils/reactions-parser';

const helpText = `
Command:
  slack-cli aggregate:members-reacted  指定された期間内に指定されたリアクションを行った回数をユーザー毎に集計してX名リストアップする

Usage:
  slack-cli aggregate:members-reacted [options]

Options:
  --channel-id      投稿先チャンネルID。--channel-id or --channel-name が必須。
  --channel-name    投稿先チャンネル名。--channel-id or --channel-name が必須。
  --start-date      集計対象の期間の開始日時。指定例: '2022-12-01T00:00:00'
  --end-date        集計対象の期間の終了日時。指定例: '2022-12-01T00:00:00'
  --reactions       集計対象のリアクション文字列。カンマ区切りで複数指定が可能。
                    []で括ると集計を一つにまとめることができる。デフォルト '+1,pray'
                    例）--reactions '+1,[pray,joy],heart' と指定した場合、pray と joy は集計を一つにまとめることができる
  --dry-run         投稿はせずに投稿内容をログ出力する
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false
  --no-mention      投稿時にメンションしない場合にのみ指定する
  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
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
  if (args === null) return;

  if (args['--help']) {
    return { text: helpText };
  }
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
    parseReactions(args['--reactions']);

  const users = (await retrieveAllUser()).filter(
    (u) =>
      !u.is_bot &&
      !u.deleted &&
      !u.is_restricted &&
      !u.is_ultra_restricted &&
      !u.is_workflow_bot
  );

  // uniq items からユーザー毎のターゲットリアクションを集計する
  // 投稿者のIDと得られたリアクションの辞書
  const skinToneRegex = /::skin-tone-\d/;
  const reactionNameToReactedMemberDict: ReactionDictionary = {};
  for (const reaction of targetReactions) {
    reactionNameToReactedMemberDict[reaction] = {};
  }

  for (const item of targetItems) {
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
      for (const user of reaction.users) {
        // 自身の投稿へのリアクションなら集計しない
        if (item.message?.user === user) continue;
        rDict[user] = (rDict[user] ?? 0) + 1;
      }
    }
  }

  if (categorizedReactions.length > 0) {
    Log.debug(categorizedReactions);
    for (const reactionNames of categorizedReactions) {
      // 後で表示する際にそのまま使える形で key にする
      // そのため、最初と最後の : が不要（ aa::bb::cc となる）
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
    (a, b) => targetReactions.indexOf(a[0]) - targetReactions.indexOf(b[0])
  )) {
    const candidates = groupBy(Object.entries(dict), ([mid, count]) => count);
    if (Object.keys(candidates).length === 0) {
      blocks.push(`:${rid}: をリアクションした人はいませんでした。`);
      continue;
    }
    console.log(rid, candidates);
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
