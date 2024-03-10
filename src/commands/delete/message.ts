import { deleteMessage } from '@/api/slack/chat';
import { Log } from '@/lib/log';
import { invalidOptionText } from '@/lib/messages';
import { parseOptions, parseSlackUrl } from '@/lib/parser';
import { CliExecFn } from '@/types';
import arg from 'arg';

const helpText = `
\`\`\`
Command:
  delete:message  url   BOTが自分で投稿したメッセージを削除する

Usage:
  slack-cli delete:message https://xxxx.slack.com/xxx [options]

Options:
  --help, -h   このヘルプを表示
  --debug      デバッグモードで実行
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
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
  const error = { error: invalidOptionText + '\n' + helpText };
  if (!argv || argv.length === 0) return error;
  const url = argv[0];
  const args = parseArgs(argv);
  if (args === null) return error;

  if (args['--help']) {
    return { text: helpText };
  }

  const options = parseOptions(args);
  const { channel, ts } = parseSlackUrl(url);

  if (!channel || !ts) {
    Log.error('不正なURLです');
    return { error: `不正なURLです ${channel}, ${ts}`, text: helpText };
  }

  const response = await deleteMessage({ channel, ts }, options);

  Log.success(response);
  return { text: `投稿を削除しました` };
};
