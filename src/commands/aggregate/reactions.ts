import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { retrieveAllUser } from '../../api/user';
import { getAllReactedItems } from '../../api/slack/reactions';
import { aggregateReactionsForEachMember } from '../../api/reaction';
import { Item } from '@slack/web-api/dist/response/ReactionsListResponse';
import { postMessageToSlack } from '../../api/slack/chat';
import { getAllChannels } from '../../api/slack/channel';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import groupBy from 'just-group-by';
import { parseOptions } from '../../lib/parser';
import shuffle from 'just-shuffle';
import { parseReactions } from './utils/reactions-parser';

const helpText = `
Command:
  slack-cli aggregate:reactions    指定された期間内に指定されたリアクション数が多いユーザーを最大5名リストアップする

Usage:
  slack-cli aggregate:reactions --channel-name general [options]

Options:
  --channel-id      投稿先チャンネルID。--channel-id or --channel-name が必須（slash-commnad の場合無視される）
  --channel-name    投稿先チャンネル名。--channel-id or --channel-name が必須（slash-command の場合無視される）
  --start-date      集計対象の期間の開始日時。指定例: '2022-12-01T00:00:00'
  --end-date        集計対象の期間の終了日時。指定例: '2022-12-01T00:00:00'
  --reactions       集計対象のリアクション文字列。カンマ区切りで複数指定が可能。
                    []で括ると集計を一つにまとめることができる。デフォルト '+1,pray'
                    例）--reactions '+1,[pray,joy],heart' と指定した場合、pray と joy は集計を一つにまとめることができる
  --include-bot-ids 集計対象の BOT ID。含めたい BOT ID をカンマ区切りで指定する
  --no-mention      投稿時にメンションしない場合にのみ指定する
  --dry-run         投稿はせずに投稿内容をログ出力する
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false。cli では利用不可。
  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
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
  if (args === null) return;

  if (args['--help']) {
    return { text: helpText };
  }
  const options = parseOptions(args);

  if (!options.endDate) options.endDate = new Date();
  if (!options.startDate) {
    options.startDate = options.endDate;
    options.startDate?.setMonth(options.endDate!.getMonth() - 1);
  }

  const { targetReactions, singleReactions, categorizedReactions } =
    parseReactions(args['--reactions']);

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

  const users = shuffle(
    (await retrieveAllUser()).filter(
      (u) =>
        (!u.is_bot ||
          (args['--include-bot-ids'] ?? '')
            .split(',')
            .some((id) => u.id === id)) &&
        !u.deleted &&
        !u.is_restricted &&
        !u.is_ultra_restricted &&
        !u.is_workflow_bot
    )
  );
  progress?.({
    percent: 0,
    message: `${users.length}人分のリアクション履歴を取得します`,
  });

  let items: Item[] = [];
  for (const [index, member] of users.entries()) {
    items.push(...(await getAllReactedItems({ user: member?.id }, options)));
    progress?.({
      percent: ((index + 1) / users.length) * 100,
      message: `${member?.name}のリアクション履歴を取得しました`,
    });
  }
  Log.debug(`集計対象投稿数（重複含む）: ${items.length}`);

  const reactionNameToCount = Object.entries(
    aggregateReactionsForEachMember(items, users)
  )
    .flatMap(([memberId, rDict]) =>
      Object.entries(rDict)
        .filter(([reactionName]) => targetReactions.includes(reactionName))
        .map(([reactionName, count]) => ({
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

  if (categorizedReactions.length > 0) {
    Log.debug(categorizedReactions);
    for (const reactionNames of categorizedReactions) {
      // 後で表示する際にそのまま使える形で key にする
      // そのため、最初と最後の : が不要（ aa::bb::cc となる）
      const key = reactionNames
        .map((r, i) => `${i !== 0 ? ':' : ''}${r}`)
        .join(':');
      const categorizedValue = Array<{ mid: string; count: number }>();
      reactionNameToCount.set(key, categorizedValue);

      for (const nameToCount of reactionNames.map(
        (name) => reactionNameToCount.get(name) ?? []
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
      .forEach((r) => reactionNameToCount.delete(r));
  }

  const blocks: string[] = [];
  const keys = [...reactionNameToCount.keys()];
  for (const key of keys.sort(
    (a, b) =>
      // 与えられた入力順で出力できるようにソートする
      targetReactions.findIndex((r) => r === a) -
      targetReactions.findIndex((r) => r === b)
  )) {
    // 同じ獲得数でまとめる
    const candidates = groupBy(reactionNameToCount.get(key)!, (c) => c.count);
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
