import { fetchMe } from '@/api/slack/auth';
import {
  getAllChannels,
  inviteToChannel,
  joinChannel,
} from '@/api/slack/channel';
import { postMessageToSlack } from '@/api/slack/chat';
import { Log } from '@/lib/log';
import { invalidOptionText } from '@/lib/messages';
import { parseOptions } from '@/lib/parser';
import { CliExecFn } from '@/types';
import arg from 'arg';

const helpText = `
\`\`\`
Command:
  join:public-channels    BOT が参加していないパブリックチャンネルにユーザーを先に参加させてから BOT を招待することで参加させる

Usage:
  slack-cli join:public-channels [options]

Options:
  --notify-channel      通知先チャンネル ID
  --notify-icon         通知先チャンネルに表示するアイコン
  --notify-display-name 通知先チャンネルに表示する名前
  --help, -h            このヘルプを表示
  --debug               デバッグモードで実行する
  --dry-run             処理はせずに新規参加するチャンネルをログ出力する
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--notify-channel': String,
        '--notify-icon': String,
        '--notify-display-name': String,
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
  if (args === null) return { error: invalidOptionText + '\n' + helpText };

  if (args['--help']) {
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

  const dryRun = args['--dry-run'];
  const notifyChannel = args['--notify-channel'];
  const notifyIcon = args['--notify-icon']
    ? `:${args['--notify-icon'].replace(/:/g, '')}:`
    : undefined;
  const notifyDisplayName = args['--notify-display-name'];

  // 1. Get the list of channels where Bot and User are not participating
  // 2. User joins the channel first
  // 3. User Invites Bot
  await Promise.all([
    // channel list to be invited
    getAllChannels({}, { ...options, asBot: true }),
    // channel list to invite BOT
    getAllChannels({}, { ...options, asBot: false }),
  ]).then(async ([channelsAsBot, channelsAsUser]) => {
    const channelsToBeInvited = channelsAsBot.filter(
      (ch) =>
        ch.is_channel &&
        !ch.is_member &&
        !ch.is_archived &&
        !ch.is_private &&
        !ch.is_org_shared &&
        !ch.is_shared
    );
    const joinedChannels = channelsAsUser.filter(
      (ch) => channelsToBeInvited.some((c) => c.id === ch.id) && !ch.is_member
    );
    Log.debug(
      'joinedChannels',
      joinedChannels.map((ch) => `${ch.name} (${ch.id})`)
    );
    for (const ch of joinedChannels) {
      const message = `${dryRun ? '[dry-run] ' : ''}User is joining to #${ch.name} (${ch.id})`;
      Log.success(message);
      if (dryRun) continue;
      await joinChannel(
        { channel: ch.id! },
        { ...options, asBot: false }
      ).catch((e) => {
        Log.error(e);
      });
    }
    for (const ch of channelsToBeInvited) {
      const message = `${dryRun ? '[dry-run] ' : ''}User is inviting BOT to #${ch.name} (${ch.id})`;
      Log.success(message);
      if (dryRun) continue;
      await inviteToChannel(
        { channel: ch.id!, users: botUserId },
        { ...options, asBot: false }
      ).catch((e) => {
        Log.error(e);
      });
    }

    if (!notifyChannel) return;
    const text = `Hey, you joined following channels for me!\n${joinedChannels.map((ch) => `<#${ch.id}> ( \`${ch.name}\` )`).join('\n')}`;
    if (dryRun) {
      Log.success(
        '[dry-run]',
        notifyChannel,
        notifyIcon,
        notifyDisplayName,
        text
      );
      return;
    }
    await postMessageToSlack(
      {
        channel: notifyChannel,
        text,
        username: notifyDisplayName,
        icon_emoji: notifyIcon,
      },
      { ...options, asBot: true }
    );
  });
};
