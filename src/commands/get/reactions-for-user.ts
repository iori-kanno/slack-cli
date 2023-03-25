import arg from 'arg';
import { invalidOptionText, listUpMembersHelpText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import {
  mapUserIdToMember,
  mapUserNameToMember,
  retrieveAllUser,
} from '../../api/user';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';
import { getAllReactedItems } from '../../api/slack/reactions';
import { aggregateReactionsForEachMember } from '../../api/reaction';
import { parseOptions } from '../../lib/parser';

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--user-id': String,
        '--user-name': String,
        '--start-date': String,
        '--end-date': String,
        '--dry-run': Boolean,
        '--help': Boolean,

        // Alias
        '-h': '--help',
        '-uid': '--user-id',
        '-uname': '--user-name',
      },
      { argv }
    );
  } catch (e: any) {
    if (e.code === 'ARG_UNKNOWN_OPTION') {
      Log.error(invalidOptionText);
    } else {
      Log.error(e);
    }
    Log.warn(listUpMembersHelpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success(listUpMembersHelpText);
    return;
  }
  const options = parseOptions(args);

  const start = args['--start-date']
    ? new Date(args['--start-date'])
    : new Date('2022-10-31T23:59:59');
  const end = args['--end-date']
    ? new Date(args['--end-date'])
    : new Date('2022-12-31T00:00:00');

  let member: Member | undefined;
  if (args['--user-name']) {
    member = await mapUserNameToMember(args['--user-name']);
  } else if (args['--user-id']) {
    member = await mapUserIdToMember(args['--user-id']);
  } else {
    Log.error('--user-id または --user-name を指定してください。');
    return;
  }

  if (!member) {
    Log.error('指定されたユーザーが見つかりませんでした。');
    return;
  }
  const users = (await retrieveAllUser()).filter(
    (u) => !u.is_bot && !u.deleted
  );
  const items = await getAllReactedItems(
    { user: member?.id, limit: 5 },
    { startDate: start, endDate: end }
  );
  Log.debug('count: ', items.length);

  const res = aggregateReactionsForEachMember(items, users);
  const res2 = Object.keys(res).map((id) => {
    const member = users.find((m) => m.id === id);
    return {
      id,
      name: member?.real_name || member?.name,
      reactions: res[id],
    };
  });
  Log.debug(res2);
};
