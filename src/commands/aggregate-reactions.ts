import arg from 'arg';
import { invalidOptionText, aggregateReactionsHelpText } from '../lib/messages';
import { CliExecFn, SlackDemoOptions } from '../types';
import * as Log from '../lib/log';
import { retrieveAllUser } from '../api/user';
import { getAllReactedItems } from '../api/slack/reactions';
import { aggregateReactionsForEachMember } from '../api/reaction';
import { Item } from '@slack/web-api/dist/response/ReactionsListResponse';
import { postMessageToSlack } from '../api/slack/chat';
import { getAllChannels } from '../api/slack/channel';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';

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
    Log.error(aggregateReactionsHelpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success(aggregateReactionsHelpText);
    return;
  }
  Log.setDebug(args['--debug']);
  const options: SlackDemoOptions = {
    asBot: args['--as-user'] === undefined ? true : !args['--as-user'],
    dryRun: args['--dry-run'],
    startDate: args['--start-date']
      ? new Date(args['--start-date'])
      : undefined,
    endDate: args['--end-date'] ? new Date(args['--end-date']) : undefined,
  };

  if (!options.endDate) options.endDate = new Date();
  if (!options.startDate) {
    options.startDate = options.endDate;
    options.startDate?.setMonth(options.endDate!.getMonth() - 1);
  }

  const targetReactions = args['--reactions']
    ? args['--reactions'].split(',')
    : ['to-be-oriented', 'feelspecial', 'simplify-x', 'simplify-x-2'];

  // dry-run でないなら投稿先チャンネルは必須
  let channel: Channel | undefined;
  if (!options.dryRun) {
    channel = (await getAllChannels({}, options)).find(
      (c) => c.id === args['--channel-id'] || c.name === args['--channel-name']
    );
    if (!channel) {
      Log.error('投稿先チャンネルを指定してください。');
      return;
    }
  }

  const users = (await retrieveAllUser()).filter(
    (u) => !u.is_bot && !u.deleted
  );

  let items: Item[] = [];
  for (const member of users) {
    items.push(...(await getAllReactedItems({ user: member?.id }, options)));
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

  const blocks: string[] = [];
  const keys = [...reactionNameToCount.keys()];
  for (const key of keys) {
    const list = reactionNameToCount
      .get(key)!
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    if (list.length === 0) {
      blocks.push(`:${key}: を獲得した人はいませんでした。`);
      continue;
    }
    const text = `最も :${key}: を獲得したトップ${
      list.length
    }は、この人たちです！\n${list
      .map(({ mid, count }, index) => {
        const member = users.find((m) => m.id === mid);
        return `${index + 1}. <@${mid}> (${count})`;
      })
      .join('\n')}`;
    blocks.push(text);
  }
  blocks.push(
    ...targetReactions
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
        text: `${options.startDate?.toLocaleDateString() ?? '未設定'}~${
          options.endDate?.toLocaleDateString() ?? '現在'
        }の期間で最もリアクションを貰った人を表彰します🎉`,
        blocks: blocks.flatMap((b) => [
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
