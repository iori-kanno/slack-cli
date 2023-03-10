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
import groupBy from 'just-group-by';

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

  // dry-run ????????????????????????????????????????????????
  let channel: Channel | undefined;
  if (!options.dryRun) {
    channel = (await getAllChannels({ types: 'public_channel' }, options)).find(
      (c) => c.id === args['--channel-id'] || c.name === args['--channel-name']
    );
    if (!channel) {
      Log.error('??????????????????????????????????????????????????????');
      return;
    }
  }

  const users = (await retrieveAllUser()).filter(
    (u) =>
      !u.is_bot &&
      !u.deleted &&
      !u.is_restricted &&
      !u.is_ultra_restricted &&
      !u.is_workflow_bot
  );

  let items: Item[] = [];
  for (const member of users) {
    items.push(...(await getAllReactedItems({ user: member?.id }, options)));
  }
  Log.debug(`???????????????????????????????????????: ${items.length}`);

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
    // ??????????????????????????????
    const candidates = groupBy(reactionNameToCount.get(key)!, (c) => c.count);
    if (Object.keys(candidates).length === 0) {
      blocks.push(`:${key}: ?????????????????????????????????????????????`);
      continue;
    }
    // ?????????????????????????????? 5???????????????????????????????????????????????? 5???????????????????????????????????????????????????
    const list: { mid: string; count: number; rank: number }[] = [];
    for (const c of Object.entries(candidates).reverse()) {
      if (list.length >= 5) break;
      list.push(...c[1].map((m) => ({ ...m, rank: list.length + 1 })));
    }
    const text = `?????? :${key}: ????????????????????????${
      list.length
    }??????????????????????????????\n${list
      .map(({ mid, count, rank }) => {
        const member = users.find((m) => m.id === mid);
        return `${rank}. <@${mid}> (${count})`;
      })
      .join('\n')}`;
    blocks.push(text);
  }
  blocks.push(
    ...targetReactions
      .filter((r) => ![...keys].includes(r))
      .map((r) => `:${r}: ?????????????????????????????????????????????`)
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
          `${options.startDate?.toLocaleDateString() ?? '?????????'}~${
            options.endDate?.toLocaleDateString() ?? '??????'
          }?????????????????????????????????????????????????????????????????????????`,
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
