import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { retrieveAllUser } from '../../api/user';
import { aggregateReactionsForEachMember } from '../../api/reaction';
import { postMessageToSlack } from '../../api/slack/chat';
import { getAllChannels } from '../../api/slack/channel';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import groupBy from 'just-group-by';
import { parseOptions } from '../../lib/parser';
import { parseReactions } from './utils/reactions-parser';
import { aggregateUniqItemsReactedByMembers } from '../../lib/aggregator';
import { buildSheetReactions } from './utils/build-sheet';

const helpText = `
\`\`\`
Command:
  aggregate:reactions    指定された期間内に指定されたリアクション数が多いユーザーを5位までをリストアップする

Usage:
  slack-cli aggregate:reactions --channel-name general [options]

Options:
  --channel-id      投稿先チャンネルID。slash-command 以外では --channel-id or --channel-name が必須。
  --channel-name    投稿先チャンネル名。slash-command 以外では --channel-id or --channel-name が必須。
  --start-date      集計対象の期間の開始日時。指定例: '2022-12-01' 指定がない場合は実行日時の 1ヶ月前となる。
  --end-date        集計対象の期間の終了日時。指定例: '2022-12-01' 指定がない場合は実行日時となる。
  --reactions       集計対象のリアクション文字列。カンマ区切りで複数指定が可能。
                    []で括ると集計を一つにまとめることができる。デフォルト '+1,pray'
                    例）--reactions '+1,[pray,joy],heart' と指定した場合、pray と joy は集計を一つにまとめることができる
  --include-bot-ids 集計対象の BOT ID。含めたい BOT ID をカンマ区切りで指定する
  --no-mention      投稿時にメンションしない場合にのみ指定する
  --dry-run         投稿はせずに投稿内容をログ出力する
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false。cli では利用不可。
  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--channel-id': String,
        '--channel-name': String,
        '--start-date': String,
        '--end-date': String,
        '--reactions': String,
        '--include-bot-ids': String,
        '--no-mention': Boolean,
        '--dry-run': Boolean,
        '--as-user': Boolean,
        '--debug': Boolean,
        '--help': Boolean,

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

export const exec: CliExecFn = async (argv, progress) => {
  const args = parseArgs(argv);
  if (args === null) return { error: invalidOptionText + '\n' + helpText };

  if (args['--help']) {
    return { text: helpText };
  }
  const options = parseOptions(args);
  const { targetReactions, singleReactions, categorizedReactions } =
    await parseReactions(args['--reactions']);

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

  const users = await retrieveAllUser(options);
  const items =
    (await aggregateUniqItemsReactedByMembers(options, progress)) || [];

  const allReactionNameToCount = Object.entries(
    aggregateReactionsForEachMember(items, users)
  )
    .flatMap(([memberId, rDict]) =>
      Object.entries(rDict).map(([reactionName, count]) => ({
        key: reactionName,
        memberId,
        count,
      }))
    )
    .reduce((acc, v) => {
      const elm = { mid: v.memberId, count: v.count };
      acc.set(v.key, acc.has(v.key) ? [...acc.get(v.key)!, elm] : [elm]);
      return acc;
    }, new Map<string, Array<{ mid: string; count: number }>>());

  let url: string | undefined;
  if (process.env.GOOGLE_SPREADSHEET_ID) {
    url = await buildSheetReactions(
      {
        sheetId: process.env.GOOGLE_SPREADSHEET_ID,
        command: `aggregate:reactions ${(argv ?? []).join(' ')}`,
        targetReactions,
        dict: allReactionNameToCount,
      },
      options
    );
  }

  const targetReactionNameToCount = new Map<
    string,
    Array<{ mid: string; count: number }>
  >();
  for (const [reactionName, nameToCount] of allReactionNameToCount) {
    if (!targetReactions.includes(reactionName)) continue;
    targetReactionNameToCount.set(reactionName, nameToCount);
  }

  if (categorizedReactions.length > 0) {
    for (const reactionNames of categorizedReactions) {
      // 後で表示する際にそのまま使える形で key にする
      // そのため、最初と最後の : が不要（ aa::bb::cc となる）
      const key = reactionNames
        .map((r, i) => `${i !== 0 ? ':' : ''}${r}`)
        .join(':');
      const categorizedValue = Array<{ mid: string; count: number }>();
      targetReactionNameToCount.set(key, categorizedValue);

      for (const nameToCount of reactionNames.map(
        (name) => targetReactionNameToCount.get(name) ?? []
      )) {
        // 全メンバーのまとめる対象の count を合計する
        for (const v of nameToCount) {
          const value = categorizedValue.find((e) => e.mid === v.mid);
          if (value) {
            value.count += v.count;
          } else {
            categorizedValue.push({ ...v });
          }
        }
      }
    }
    // single で指定されていないものを削除する
    targetReactions
      .filter((r) => !singleReactions.includes(r))
      .forEach((r) => targetReactionNameToCount.delete(r));
  }

  const blocks: string[] = [];
  const keys = [...targetReactionNameToCount.keys()];
  for (const key of keys.sort(
    (a, b) =>
      // 与えられた入力順で出力できるようにソートする
      targetReactions.findIndex((r) => r === a) -
      targetReactions.findIndex((r) => r === b)
  )) {
    // 同じ獲得数でまとめる
    const candidates = groupBy(
      targetReactionNameToCount.get(key)!,
      (c) => c.count
    );
    if (Object.keys(candidates).length === 0) {
      blocks.push(`:${key}: を獲得した人はいませんでした。`);
      continue;
    }
    // 獲得数が一番多い順に 5位まで、もしくは同列順位を含めて 5人以上になるようにリストアップする
    const list: { mid: string; count: number; rank: number }[] = [];
    for (const c of Object.entries(candidates).reverse()) {
      if (list.length >= 5) break;
      list.push(...c[1].map((m) => ({ ...m, rank: list.length + 1 })));
    }
    const text = `最も :${key}: を獲得したトップ${
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
  blocks.push(
    ...targetReactions
      .filter((r) => singleReactions.includes(r))
      .filter((r) => ![...keys].includes(r))
      .map((r) => `:${r}: を獲得した人はいませんでした。`)
  );
  if (url) blocks.push(`\n<${url}|全ての集計結果はこちら>`);

  if (args['--dry-run']) {
    Log.success(blocks);
  } else {
    Log.success(blocks);
    await postMessageToSlack(
      {
        channel: channel!.id!,
        text: '',
        blocks: [
          `${options.startDate?.toLocaleDateString() ?? '未設定'}~${
            options.endDate?.toLocaleDateString() ?? '現在'
          }の期間で最もリアクションを貰った人を表彰します🎉`,
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
      options
    );
  }
};
