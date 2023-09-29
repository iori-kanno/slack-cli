import arg from 'arg';
import { invalidOptionText } from '../../../lib/messages';
import { CliExecFn } from '../../../types';
import * as Log from '../../../lib/log';
import { parseOptions } from '../../../lib/parser';
import { retrieveAllUser } from '../../../api/user';
import { retrieveInfoForArgs } from '../../../lib/arguments';
import { getUsergroupsMembers } from '../../../api/slack/usergroups';

const helpText = `
\`\`\`
Command:
  get:usergroups:members  指定された Usergroup に属するメンバー一覧を出力する。

Usage:
  slack-cli get:usergroups:members [options]

Options:
  --usergroup-id          対象 Usergroup ID
  --usergroup-fuzzy-name  対象 Usergroup 名。完全一致である必要はないが、複数当てはまる場合は最初にヒットしたユーザーグループにマッピングされるので注意。
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
        '--usergroup-id': String,
        '--usergroup-fuzzy-name': String,
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

  const { usergroup } = await retrieveInfoForArgs({
    usergroupId: args['--usergroup-id'],
    usergroupFuzzyName: args['--usergroup-fuzzy-name'],
  });
  if (!usergroup) {
    return { error: '対象の Usergroup が見つかりませんでした。' };
  }

  const allMembers = await retrieveAllUser(options);
  const members = await getUsergroupsMembers(
    { usergroup: usergroup.id! },
    options
  )
    .then((res) => res.users)
    .then((ids) => allMembers.filter((m) => ids?.includes(m.id!)));

  const response = `${usergroup.name} (${usergroup.id}) メンバー一覧 (${
    members.length
  }, 内 BOT ${members.filter((m) => m.is_bot).length})\n${members
    .map((m) => `${m.id}: ${m.real_name ?? m.name}${m.is_bot ? ' (BOT)' : ''}`)
    .join('\n')}`;

  if (options.dryRun) {
    Log.success(response);
    return;
  }
  return { text: '```\n' + response + '\n```' };
};
