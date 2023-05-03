import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { showMembersInChannel } from '../../api/slack/channel';
import { parseOptions } from '../../lib/parser';
import { retrieveAllUser } from '../../api/user';
import { retrieveInfoForArgs } from '../../lib/arguments';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';

const helpText = `
\`\`\`
Command:
  get:members  Slackに参加しているメンバー一覧を出力する。チャンネルを指定するとそのチャンネルに参加しているメンバーのみを出力する。

Usage:
  slack-cli get:members [options]

Options:
  --channel-id      対象チャンネルID
  --channel-name    対象チャンネル名
  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
  TODO: 指定したチャンネルに投稿できるようにする
\`\`\`
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
    Log.error(helpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return { error: invalidOptionText + '\n' + helpText };

  if (args['--help']) {
    Log.success(helpText);
    return { text: helpText };
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

  const response = `${channel ? '#' + channel.name : ''} メンバー一覧 (${
    members.length
  }, 内 BOT ${members.filter((m) => m.is_bot).length})\n${members
    .map((m) => `${m.id}: ${m.real_name ?? m.name}${m.is_bot ? ' (BOT)' : ''}`)
    .join('\n')}`;

  if (options.dryRun) {
    Log.success(response);
    return;
  }
  return { text: '```' + response + '```' };
};
