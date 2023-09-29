import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { parseOptions } from '../../lib/parser';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';
import { openConversation } from '../../api/slack/conversations';
import { mapUserIdsToMembers, retrieveAllUser } from '../../api/user';
import { postMessageToSlack } from '../../api/slack/chat';
import { blockTemplates } from './utils/constants';
import { loadUserIds } from './utils/spread-sheet';

const helpText = `
\`\`\`
Command:
  pulse:hearing     スプレッドシートから対象の UserId を取得して DM で最近の調子を訪ね、回答をスプレッドシートに書き込む

Usage:
  slack-cli pulse:hearing [options]

Options:
  --user-ids        スプレッドシートを使わずに , 区切りで指定した UserId のユーザーに DM で質問する

  --help, -h        このヘルプを表示
  --debug           デバッグモードで実行する
  --dry-run         投稿はせずに投稿内容をログ出力する
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--user-ids': String,
        '--dry-run': Boolean,
        '--debug': Boolean,
        '--help': Boolean,

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

  // スプレッドシート or --user-ids で指定したユーザーの ID を取得する
  let users: Member[] = [];
  if (args['--user-ids']) {
    const userIds = args['--user-ids'].split(',');
    users = await mapUserIdsToMembers(userIds, options);
  } else {
    const userIds = (await loadUserIds(options)) || [];
    Log.debug('userIds', userIds);
    const allUsers = await retrieveAllUser(options);
    const listedUsers = await mapUserIdsToMembers(userIds, options);
    const notListedUsers = allUsers.filter(
      (u) =>
        !listedUsers.map(({ id }) => id).includes(u.id) && u.id !== 'USLACKBOT'
    );
    if (notListedUsers.length > 0) {
      Log.warn(
        `以下のユーザーはスプレッドシートに登録されていません。スプレッドシートに登録してください。`
      );
      Log.warn(
        JSON.stringify(
          notListedUsers.map((u) => delete u.profile && u),
          null,
          2
        )
      );
    }
    // リストにあっても削除済み、制限されている、ワークフローボットの場合は除外する
    users = listedUsers.filter(
      (u) =>
        !u.deleted &&
        !u.is_restricted &&
        !u.is_ultra_restricted &&
        !u.is_workflow_bot
    );
    const restrictedUsers = listedUsers.filter((u) => !users.includes(u));
    if (restrictedUsers.length > 0) {
      Log.warn(
        `以下のユーザーは削除済み、制限されている、ワークフローボットなので除外しました。`
      );
      Log.warn(
        JSON.stringify(
          restrictedUsers.map((u) => delete u.profile && u),
          null,
          2
        )
      );
    }
  }

  // DM で質問する
  let all: string[] = [];
  for (const u of users) {
    if (options.dryRun) {
      all.push(`I'll ask ${u.real_name || u.name}.`);
    } else {
      const res = await openConversation(
        { users: u.id, return_im: true },
        options
      );
      if (res.channel?.is_im && res?.channel?.id) {
        const res2 = await postMessageToSlack(
          {
            channel: res.channel?.id,
            blocks: blockTemplates,
            // WARN が出るので指定する。blocks が優先表示されるのでこのテキストは表示されない。
            text: "your app hasn't supported blocks...",
          },
          options
        );
      }
      all.push(`I asked ${u.real_name || u.name}.`);
    }
  }

  return {
    text: '```\n' + all.join('\n') + `\nTotal ${all.length} users.\n` + '```',
  };
};
