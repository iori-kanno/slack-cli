import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import { Item } from '@slack/web-api/dist/response/ReactionsListResponse';
import arg from 'arg';
import * as Log from './log';
import { getAllChannels } from '../api/slack/channel';
import { getAllReactedItems } from '../api/slack/reactions';
import { retrieveAllUser } from '../api/user';
import { CliExecFn, SlackDemoOptions } from '../types';
import { aggregateReactionsHelpText, invalidOptionText } from './messages';

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
        '--debug': Boolean,
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

export const aggregateUniqItemsReactedByMembers = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

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
    items.push(
      ...(await getAllReactedItems({ user: member?.id, limit: 200 }, options))
    );
  }
  Log.debug(`集計対象投稿数（重複含む）: ${items.length}`);

  // 重複排除
  const itemMap = new Map(
    items.map((item) => [
      `${item.channel}/${item.type}/${item.message?.ts}/${item.message?.thread_ts}`,
      item,
    ])
  );
  const uniqueItems = [...new Map([...itemMap].sort()).values()];
  Log.debug(
    `items(${items.length}) - uniqueItems(${uniqueItems.length}) = ${
      items.length - uniqueItems.length
    }件重複`
  );
  return uniqueItems;
};
