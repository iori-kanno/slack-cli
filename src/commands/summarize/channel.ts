import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { getAllConversations } from '../../api/slack/conversations';
import { parseOptions } from '../../lib/parser';
import { retrieveInfoForArgs } from '../../lib/arguments';
import { summarizeChannel } from '../../api/gpt/summarize/channel';
import {
  convertTsToDate,
  replaceMemberIdToNameInTexts,
} from '../../lib/helper';
import { validate } from '../../api/gpt';
import {
  convertDateToTs,
  convertToSimpleDate,
  convertTsToSimpleDate,
} from '../../lib/date';

const helpText = `
\`\`\`
Command:
  summarize:channel    指定されたチャンネルの直近の投稿をGPTで要約する
    * 環境変数に OPENAI_API_KEY, OPENAI_API_BASE の設定が必要。
    * このコマンドは、チャンネルの投稿を全て取得してから要約を行うため、取得する投稿数が多い場合は時間がかかる。

Usage:
  slack-cli summarize:channel --channel-name aaa [options]

Options:
  --channel-id      集計対象チャンネルID。slash-command 以外では --channel-id or --channel-name が必須。
  --channel-name    集計対象チャンネル名。slash-command 以外では --channel-id or --channel-name が必須。
  --start-date      集計対象の期間の開始日時。指定例: '2022-12-01' 指定がない場合は最新から limit 分取得する。
  --end-date        集計対象の期間の終了日時。指定例: '2022-12-01' 指定がない場合は最新から limit 分取得する。
  --limit           取得する投稿数。デフォルトは 500件（スレッドの投稿を取得する都合上大幅に超えてしまうこともある）
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false

  --help, -h        このヘルプを表示
  --dry-run         投稿はせずに投稿内容をログ出力する
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--channel-id': String,
        '--channel-name': String,
        '--start-date': String,
        '--end-date': String,
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
    Log.warn(helpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv, progress) => {
  const args = parseArgs(argv);
  if (args === null) return { error: invalidOptionText + '\n' + helpText };

  if (args['--help']) {
    return { text: helpText };
  }
  const options = parseOptions(args);
  if (!validate()) return;

  const { channel } = await retrieveInfoForArgs({
    channelId: args['--channel-id'],
    channelName: args['--channel-name'],
  });
  if (!channel || !channel.id) {
    Log.error(helpText);
    return { error: 'channel not found' };
  }
  const limit = Math.min(args['--limit'] || 500, 1000);
  const oldest =
    args['--start-date'] && options.startDate
      ? convertDateToTs(options.startDate)
      : undefined;
  const latest =
    args['--end-date'] && options.endDate
      ? convertDateToTs(options.endDate)
      : undefined;
  progress?.({ percent: 0, message: `${limit}件の投稿を取得開始します...` });

  // 投稿一覧
  const targetMessages = await getAllConversations(
    { channel: channel.id, limit, oldest, latest },
    limit,
    true,
    options
  );
  if (targetMessages.length === 0) {
    const text = '該当する投稿がありませんでした。';
    return {
      asUser: !options.asBot,
      postArg: { channel: channel.id!, text },
      text,
    };
  }

  progress?.({
    percent: 30,
    message: `${targetMessages.length}件の投稿を取得しました。要約を開始します...`,
  });

  const targetTexts = await replaceMemberIdToNameInTexts(
    targetMessages.map((m) =>
      ((m.user ?? '') + ': ' + m.text || '')
        .replace(/\n/g, ' ')
        .replace(/https?:\/\/[\w!\?/\+\-_~=;\.,\*&@#\$%\(\)'\[\]]+/g, 'url')
    ) || []
  );

  Log.debug(targetTexts.map((t) => t.substring(0, 30)));

  try {
    const response = await summarizeChannel(targetTexts, progress);

    const term = `${convertTsToSimpleDate(
      targetMessages[0].ts!
    )} ~ ${convertTsToSimpleDate(targetMessages.reverse()[0].ts!)}`;
    const text = `${term} ${targetMessages.length}件の投稿（内スレッド ${
      targetMessages.filter((m) => m.thread_ts && !m.reply_count).length
    }件）から、チャンネルのトピックについて要約しました。\n\`\`\`\n${response
      .split('\n')
      .filter((s) => s !== '')
      .map((s) => '・' + s.replace(/(\t| )+/, ''))
      .join('\n')}\n\`\`\``;
    if (args['--dry-run']) {
      Log.success(text);
      return;
    }
    return {
      asUser: !options.asBot,
      postArg: { channel: channel.id!, text: `<#${channel.id}> 内の${text}` },
      text: `#${channel.name} 内の${text}`,
    };
  } catch (e) {
    Log.error(e);
  }
};
