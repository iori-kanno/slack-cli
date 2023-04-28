import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { parseOptions, parseSlackUrl } from '../../lib/parser';
import { deleteMessage } from '../../api/slack/chat';

const helpText = `
Command:
  slack-cli delete:message  BOTが自分で投稿したメッセージを削除する

Usage:
  slack-cli delete:message --url https://xxx

Options:
  --url        消したい投稿のURL
  --help, -h   このヘルプを表示
  --debug      デバッグモードで実行
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--url': String,
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
  if (args === null) return;

  if (args['--help']) {
    Log.success(helpText);
    return { text: helpText };
  }
  if (!args['--url']) {
    Log.error('--url を指定してください');
    return { error: '--url を指定してください', text: helpText };
  }

  const options = parseOptions(args);
  const { channel, ts } = parseSlackUrl(args['--url']);

  if (!channel || !ts) {
    Log.error('不正なURLです');
    return { error: `不正なURLです ${channel}, ${ts}`, text: helpText };
  }

  const response = await deleteMessage({ channel, ts }, options);

  Log.success(response);
  return { text: `削除しました` };
};
