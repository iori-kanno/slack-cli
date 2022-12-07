import arg from 'arg';
import { invalidOptionText, aggregateReactionsHelpText } from '../lib/messages';
import { CliExecFn, SlackDemoOptions } from '../types';
import * as Log from '../lib/log';
import {
  getAllChannels,
  inviteToChannel,
  joinChannel,
} from '../api/slack/channel';

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--dry-run': Boolean,
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
    Log.error('TODO: 記載');
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success('TODO: 記載');
    return;
  }

  const options: SlackDemoOptions = {
    dryRun: args['--dry-run'],
    asBot: true,
  };

  await getAllChannels({}, options).then((channels) => {
    return channels
      .filter(
        (ch) =>
          ch.is_channel && !ch.is_member && !ch.is_archived && !ch.is_private
      )
      .map((ch) =>
        inviteToChannel({ channel: ch.id!, users: 'U03CB2YKVSQ' }, options)
      );
    // .map((ch) => joinChannel({ channel: ch.id! }, options))
  });
};
