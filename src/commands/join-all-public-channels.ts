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
import { fetchMe } from '../api/slack/auth';

const helpText = `
Command:
  slack-cli join:public-channels  BOT が参加していないパブリックチャンネルにユーザーを先に参加させてから BOT を招待することで参加させる

Usage:
  slack-cli join:public-channels [options]

Options:
  --help, -h        このヘルプを表示
  --debug           デバッグモードで実行する
  --dry-run         処理はせずに新規参加するチャンネルをログ出力する
`;

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
    Log.error(helpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success(helpText);
    return { text: helpText };
  }

  const options = parseOptions(args);
  const botUserId = await fetchMe({}, { ...options, asBot: true }).then(
    (res) => res.user_id
  );

  if (!botUserId) {
    Log.error('BOT の情報の取得に失敗しました');
    return;
  }

  // 1. Bot が未参加のチャンネル一覧を取得して
  // 2. 自分がまず先にチャンネルにジョインして
  // 3. Bot を招待する
  //    本当は2で既にジョイン済みならスキップしていい
  await getAllChannels({}, { ...options, asBot: true }).then((channels) => {
    return channels
      .filter(
        (ch) =>
          ch.is_channel &&
          !ch.is_member &&
          !ch.is_archived &&
          !ch.is_private &&
          !ch.is_org_shared &&
          !ch.is_shared
      )
      .map((ch) => {
        Log.debug(`Joining to #${ch.name} (${ch.id})...`);
        return ch;
      })
      .map(async (ch) => {
        await joinChannel({ channel: ch.id! }, { ...options, asBot: false });
        await inviteToChannel(
          { channel: ch.id!, users: botUserId },
          { ...options, asBot: false }
        );
      });
  });
};
