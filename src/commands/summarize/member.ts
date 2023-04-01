import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { getAllConversations } from '../../api/slack/conversations';
import { postMessageToSlack } from '../../api/slack/chat';
import { parseOptions } from '../../lib/parser';
import { summarizeUser } from '../../api/gpt/summarize/user';
import { retrieveInfoForArgs } from '../../lib/arguments';

const summarizeHelpText = `
Command:
  slack-cli summarize:member  指定されたチャンネルxユーザーの直近の投稿をGPTで要約する

Usage:
  slack-cli summarize:member --channel-name aaa --member-id bbb [options]

Options:
  --channel-id        集計対象チャンネルID。--channel-id or --channel-name が必須。
  --channel-name      集計対象チャンネル名。--channel-id or --channel-name が必須。
  --member-id, -u     メンバーのID。user-id or user-fuzzy-name が必須
  --member-fuzzy-name メンバーのアカウント名。完全一致である必要はないが、複数当てはまる場合は最初にヒットしたユーザーにマッピングされるので注意。
  --limit             取得する投稿数（チャンネルの最新投稿を limit 件ずつ取得して対象ユーザーの投稿が limit 件になるまで取得する。スレッドの投稿を取得する都合上大幅に超えてしまうこともある）
  --as-user           BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false

  --help, -h          このヘルプを表示
  --dry-run           投稿はせずに投稿内容をログ出力する
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--channel-id': String,
        '--channel-name': String,
        '--member-id': String,
        '--member-fuzzy-name': String,
        '--limit': Number,
        '--dry-run': Boolean,
        '--as-user': Boolean,
        '--help': Boolean,
        '--debug': Boolean,

        // Alias
        '-h': '--help',
        '-u': '--member-id',
      },
      { argv }
    );
  } catch (e: any) {
    if (e.code === 'ARG_UNKNOWN_OPTION') {
      Log.error(invalidOptionText);
    } else {
      Log.error(e);
    }
    Log.warn(summarizeHelpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success(summarizeHelpText);
    return;
  }
  const options = parseOptions(args);

  const { channel, member: user } = await retrieveInfoForArgs({
    channelId: args['--channel-id'],
    channelName: args['--channel-name'],
    memberId: args['--member-id'],
    memberFuzzyName: args['--member-fuzzy-name'],
  });
  if (!channel || !channel.id || !user || !user.id) {
    Log.error(summarizeHelpText);
    return;
  }
  const limit = args['--limit'] || 500;

  // 投稿一覧（対象者以外の投稿含む）
  const conversations = await getAllConversations(
    { channel: channel.id, limit: Math.min(limit, 1000) },
    limit,
    [user.id],
    options
  );

  // 対象者の投稿一覧
  const targetMessages = conversations.filter(
    (m) => m.user === user.id && m.text !== ''
  );

  Log.debug(
    targetMessages.map((m) =>
      (m.text || '')
        .replace(/https?:\/\/[\w!\?/\+\-_~=;\.,\*&@#\$%\(\)'\[\]]+/g, 'url')
        .substring(0, 30)
    )
  );

  const targetText =
    targetMessages.map((m) =>
      (m.text || '')
        .replace(/\n/g, ' ')
        .replace(/https?:\/\/[\w!\?/\+\-_~=;\.,\*&@#\$%\(\)'\[\]]+/g, 'url')
    ) || [];

  try {
    const response = await summarizeUser(targetText);

    const text = `#${channel?.name} 内の直近 ${
      targetMessages.length
    }件の投稿（内スレッド ${
      targetMessages.filter((m) => m.thread_ts && !m.reply_count).length
    }件）から、${
      user?.real_name ?? user?.name
    } について考察しました。\n${response
      .split('\n')
      .filter((s) => s !== '')
      .map((s) => '・' + s.replace(/(\t| )+/, ''))
      .join('\n')}`;
    if (args['--dry-run']) {
      Log.success(text);
    } else {
      await postMessageToSlack({ channel: channel!.id!, text }, options);
    }
  } catch (e) {
    Log.error(e);
  }
};
