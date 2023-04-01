import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { getAllChannels } from '../../api/slack/channel';
import { parseOptions } from '../../lib/parser';

const helpText = `TODO: help text`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--channel-id': String,
        '--channel-name': String,
        '--dry-run': Boolean,
        '--help': Boolean,

        // Alias
        '-h': '--help',
        '-cid': '--channel-id',
        '-cname': '--channel-name',
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

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success(helpText);
    return;
  }
  const options = parseOptions(args);
  if (args['--channel-name']) {
    const channels = (await getAllChannels({ exclude_archived: false }))
      .filter((a) => !a.is_private)
      .sort((a, b) =>
        (a.name ?? '' + a.id).toString().toLowerCase() >
        (b.name ?? '' + b.id).toString().toLowerCase()
          ? 1
          : -1
      );
    Log.debug(
      `パブリックチャンネル一覧（${channels.length}）\n`,
      channels
        .map(
          (c) => c.id + ': ' + c.name + `${c.is_archived ? ' (archived)' : ''}`
        )
        .join('\n'),
      '\n\n'
    );
    const channelName = channels.find((c) => c.name === args['--channel-name']);
    if (!channelName) {
      Log.error(
        '--channel-name に指定されたチャンネル名が見つかりませんでした。'
      );
      return;
    }
  }
  // if (args['--url']) {
  //   const { channel, ts } = parseSlackUrl(args['--url']);
  //   await aggregateReactions(channel, ts, options);
  // } else if (args['--channel'] && args['--timestamp']) {
  //   await aggregateReactions(args['--channel'], args['--timestamp'], options);
  // }
};
