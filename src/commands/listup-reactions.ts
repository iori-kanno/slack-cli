import arg from 'arg';
import { invalidOptionText, listUpMembersHelpText } from '../lib/messages';
import { CliExecFn } from '../types';
import * as Log from '../lib/log';
import { aggregateReactions } from '../api/reaction';
import { parseOptions, parseSlackUrl } from '../lib/parser';

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--url': String,
        '--timestamp': String,
        '--channel': String,
        '--dry-run': Boolean,
        '--as-user': Boolean,
        '--help': Boolean,

        // Alias
        '-h': '--help',
        '-u': '--url',
        '-t': '--timestamp',
        '-c': '--channel',
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
  if (args['--url']) {
    const { channel, ts } = parseSlackUrl(args['--url']);
    await aggregateReactions(channel, ts, options);
  } else if (args['--channel'] && args['--timestamp']) {
    await aggregateReactions(args['--channel'], args['--timestamp'], options);
  }
};
