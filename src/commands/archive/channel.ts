import { getAllConversations } from '@/api/slack/conversations';
import { archiveChannel } from '@/api/webhook/archive';
import { retrieveInfoForArgs } from '@/lib/arguments';
import { convertTsToSimpleDate } from '@/lib/date';
import { Log } from '@/lib/log';
import { invalidOptionText } from '@/lib/messages';
import { parseOptions } from '@/lib/parser';
import { CliExecFn } from '@/types';
import arg from 'arg';

const helpText = `
\`\`\`
Command:
  archive:channel     指定されたチャンネルをアーカイブする

Usage:
  slack-cli archive:channel --channel-id CXXXXXX [options]

Options:
  --channel-id    アーカイブするチャンネルID。--channel-id または --channel-name が必須。
  --channel-name  アーカイブするチャンネル名。--channel-id または --channel-name が必須。
  --help, -h      このヘルプを表示
  --debug         デバッグモードで実行
  --dry-run       実際にアーカイブせずにログ出力する
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--help': Boolean,
        '--debug': Boolean,
        '--dry-run': Boolean,

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
  const channelId = argv[0];
  const args = parseArgs(argv);
  if (args === null) return error;

  if (args['--help']) {
    return { text: helpText };
  }

  const options = parseOptions(args);
  const { channel } = await retrieveInfoForArgs({
    channelId: args['--channel-id'],
    channelName: args['--channel-name'],
  });

  if (!channel) {
    return {
      error: `指定されたチャンネルが見つかりませんでした`,
      text: helpText,
    };
  }

  const limit = 30;
  const targetMessages = (
    await getAllConversations(
      { channel: channel.id!, limit },
      limit,
      true,
      options
    )
  ).reverse();

  const latestTs = targetMessages.find((m) => m.ts)?.ts;
  const latestPostDate = latestTs
    ? convertTsToSimpleDate(latestTs)
    : '投稿無し';

  const response = await archiveChannel({ channelId, latestPostDate }, options);

  return {
    text: `archived ${channelId}: ${JSON.stringify(response)}`,
  };
};
