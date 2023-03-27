import arg from 'arg';
import { invalidOptionText, listUpMembersHelpText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { getAllChannels, showMembersInChannel } from '../../api/slack/channel';
import { parseOptions } from '../../lib/parser';
import { retrieveAllUser } from '../../api/user';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';

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
    Log.error('TODO');
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success('TODO');
    return;
  }
  Log.setDebug(args['--debug']);
  const options = parseOptions(args);
  if (args['--channel-name']) {
    const channels = (
      await getAllChannels({ exclude_archived: false }, options)
    )
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

  const targetChannel = (
    await getAllChannels({ exclude_archived: false }, options)
  ).find(
    (c) => c.id === args['--channel-id'] || c.name === args['--channel-name']
  );
  const allMembers = await retrieveAllUser(options);
  const members = Array<Member>();
  if (targetChannel) {
    const info = await showMembersInChannel(
      { channel: targetChannel.id! },
      options
    );
    Log.debug(info);
    members.push(...allMembers.filter((m) => info.members?.includes(m.id!)));
  } else {
    members.push(...allMembers);
  }

  const text = `${
    targetChannel ? '#' + targetChannel.name : ''
  } メンバー一覧\n${members
    .map((m) => `${m.id}: ${m.real_name ?? m.name}`)
    .join('\n')}`;

  Log.success(text);
};
