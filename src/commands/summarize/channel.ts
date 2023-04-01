import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { getAllConversations } from '../../api/slack/conversations';
import { postMessageToSlack } from '../../api/slack/chat';
import { parseOptions } from '../../lib/parser';
import { retrieveInfoForArgs } from '../../lib/arguments';
import { summarizeChannel } from '../../api/gpt/summarize/channel';
import { replaceMemberIdToNameInTexts } from '../../lib/helper';
import { validate } from '../../api/gpt';

const summarizeHelpText = `
Command:
  slack-cli summarize:channel    指定されたチャンネルの直近の投稿をGPTで要約する
  * 環境変数に OPENAI_API_KEY, OPENAI_API_BASE の設定が必要。
  * このコマンドは、チャンネルの投稿を全て取得してから要約を行うため、取得する投稿数が多い場合は時間がかかる。

Usage:
  slack-cli summarize:channel --channel-name aaa [options]

Options:
  --channel-id      集計対象チャンネルID。--channel-id or --channel-name が必須。
  --channel-name    集計対象チャンネル名。--channel-id or --channel-name が必須。
  --limit           取得する投稿数。デフォルトは 500件（スレッドの投稿を取得する都合上大幅に超えてしまうこともある）
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false

  --help, -h        このヘルプを表示
  --dry-run         投稿はせずに投稿内容をログ出力する
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--channel-id': String,
        '--channel-name': String,
        '--limit': Number,
        '--dry-run': Boolean,
        '--as-user': Boolean,
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
  if (!validate()) return;

  const { channel } = await retrieveInfoForArgs({
    channelId: args['--channel-id'],
    channelName: args['--channel-name'],
  });
  if (!channel || !channel.id) {
    Log.error(summarizeHelpText);
    return;
  }
  const limit = args['--limit'] || 500;

  // 投稿一覧
  const targetMessages = await getAllConversations(
    { channel: channel.id, limit: Math.min(limit, 1000) },
    limit,
    undefined,
    options
  );

  const targetText = await replaceMemberIdToNameInTexts(
    targetMessages.map((m) =>
      ((m.user ?? '') + ': ' + m.text || '')
        .replace(/\n/g, ' ')
        .replace(/https?:\/\/[\w!\?/\+\-_~=;\.,\*&@#\$%\(\)'\[\]]+/g, 'url')
    ) || []
  );

  Log.debug(targetText.map((t) => t.substring(0, 30)));

  try {
    const response = await summarizeChannel(targetText);

    const text = `#${channel?.name} 内の直近 ${
      targetMessages.length
    }件の投稿（内スレッド ${
      targetMessages.filter((m) => m.thread_ts && !m.reply_count).length
    }件）から、チャンネルのトピックについて要約しました。\n${response
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
