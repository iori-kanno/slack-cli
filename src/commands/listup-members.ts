import arg from 'arg';
import { invalidOptionText, listUpMembersHelpText } from '../lib/messages';
import { CliExecFn } from '../types';
import * as Log from '../lib/log';
import { aggregateReactions } from '../api/reaction';
import { parseSlackUrl } from '../lib/helper';

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--url': String,
        '--timestamp': String,
        '--channel': String,
        '--dry-run': Boolean,
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
    console.log(listUpMembersHelpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    console.log(listUpMembersHelpText);
    return;
  }
  if (args['--url']) {
    const { channel, ts } = parseSlackUrl(args['--url']);
    await aggregateReactions(channel, ts, args['--dry-run']);
  } else if (args['--channel'] && args['--timestamp']) {
    await aggregateReactions(
      args['--channel'],
      args['--timestamp'],
      args['--dry-run']
    );
  }
};
