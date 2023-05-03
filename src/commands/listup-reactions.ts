import arg from 'arg';
import { invalidOptionText } from '../lib/messages';
import { CliExecFn } from '../types';
import * as Log from '../lib/log';
import { aggregateReactions } from '../api/reaction';
import { parseOptions, parseSlackUrl } from '../lib/parser';

const helpText = `
\`\`\`
Command:
  listup:reactions  指定された投稿に付いているリアクションを集計してスレッドに投稿する

Usage:
  slack-cli listup:reactions -url slack-url [options]

Options:
  --url, -u         指定したい投稿の slack url
  --timestamp, -t   指定したい投稿のタイムスタンプ。url の代わりに指定することができる。-c 必須。
  --channel, -c     指定したい投稿があるチャンネル。url の代わりに指定することができる。-t 必須。
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false
  --dry-run         投稿はせずに投稿内容をログ出力する
  --help, -h        このヘルプを表示
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--url': String,
        '--timestamp': String,
        '--channel': String,
        '--as-user': Boolean,
        '--dry-run': Boolean,
        '--help': Boolean,

        // Alias
        '-h': '--help',
        '-u': '--url',
        '-t': '--timestamp',
        '-c': '--channel',
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

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return { error: invalidOptionText + '\n' + helpText };

  if (args['--help']) {
    Log.success(helpText);
    return { text: helpText };
  }
  const options = parseOptions(args);
  if (args['--url']) {
    const { channel, ts } = parseSlackUrl(args['--url']);
    await aggregateReactions(channel, ts, options);
  } else if (args['--channel'] && args['--timestamp']) {
    await aggregateReactions(args['--channel'], args['--timestamp'], options);
  }
};
