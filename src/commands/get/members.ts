import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { getAllChannels, showMembersInChannel } from '../../api/slack/channel';
import { parseOptions } from '../../lib/parser';
import { retrieveAllUser } from '../../api/user';
import { retrieveInfoForArgs } from '../../lib/arguments';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';

const getMembersHelpText = `
Command:
  slack-cli get:members  Slackに参加しているメンバー一覧を出力する。チャンネルを指定するとそのチャンネルに参加しているメンバーのみを出力する。

Usage:
  slack-cli get:members [options]

Options:
  --channel-id      投稿先チャンネルID
  --channel-name    投稿先チャンネル名
  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
  TODO: 指定したチャンネルに投稿できるようにする
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--channel-id': String,
        '--channel-name': String,
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
    Log.error(getMembersHelpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success(getMembersHelpText);
    return;
  }
  const options = parseOptions(args);

  const { channel } = await retrieveInfoForArgs({
    channelId: args['--channel-id'],
    channelName: args['--channel-name'],
    options,
  });

  const allMembers = await retrieveAllUser(options);
  const members = Array<Member>();
  if (channel) {
    const info = await showMembersInChannel({ channel: channel.id! }, options);
    Log.debug(info);
    members.push(...allMembers.filter((m) => info.members?.includes(m.id!)));
  } else {
    members.push(...allMembers);
  }

  const text = `${channel ? '#' + channel.name : ''} メンバー一覧 (${
    members.length
  }, 内 BOT ${members.filter((m) => m.is_bot).length})\n${members
    .map((m) => `${m.id}: ${m.real_name ?? m.name}${m.is_bot ? ' (BOT)' : ''}`)
    .join('\n')}`;

  Log.success(text);
};
