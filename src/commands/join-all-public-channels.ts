import arg from 'arg';
import { invalidOptionText } from '../lib/messages';
import { CliExecFn } from '../types';
import * as Log from '../lib/log';
import {
  getAllChannels,
  inviteToChannel,
  joinChannel,
} from '../api/slack/channel';
import { parseOptions } from '../lib/parser';

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

  const options = parseOptions(args);

  // 1. Bot が未参加のチャンネル一覧を取得して
  // 2. 自分がまず先にチャンネルにジョインして
  // 3. Bot を招待する
  //    本当は2で既にジョイン済みならスキップしていい
  await getAllChannels({}, { ...options, asBot: true }).then((channels) => {
    return (
      channels
        .filter(
          (ch) =>
            ch.is_channel &&
            !ch.is_member &&
            !ch.is_archived &&
            !ch.is_private &&
            !ch.is_org_shared &&
            !ch.is_shared
        )
        // .forEach((ch) => console.log(ch));
        .map(async (ch) => {
          await joinChannel({ channel: ch.id! }, { ...options, asBot: false });
          await inviteToChannel(
            { channel: ch.id!, users: 'U03CB2YKVSQ' },
            { ...options, asBot: false }
          );
        })
    );
  });
};
