import arg from 'arg';
import { invalidOptionText } from '../../lib/messages';
import { CliExecFn } from '../../types';
import * as Log from '../../lib/log';
import { getAllChannels } from '../../api/slack/channel';
import { parseOptions } from '../../lib/parser';
import orderBy from 'just-order-by';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';

const helpText = `
Command:
  slack-cli get:channels  チャンネル一覧を出力する。オプションで各種フィルターやソートが使える。

Usage:
  slack-cli get:channels [options]

Options:
  --filter-prefix   チャンネル名の前方一致
  --filter-suffix   チャンネル名の後方一致
  --includes        チャンネル名に含める文字列（,区切りで複数指定可能。その場合の条件は OR）
  --excludes        チャンネル名から除外する文字列（,区切りで複数指定可能。その場合の条件は AND）
  --max-members     チャンネルに参加している人数の上限
  --min-members     チャンネルに参加している人数の下限
  --sort-name       名前で並び替えて表示
  --sort-date       日付で並び替えて表示
  --sort-members    メンバー数順に並び替えて表示
  --asc             --sort オプションと一緒に使用。デフォルトは asc
  --desc            --sort オプションと一緒に使用。デフォルトは asc

  --help, -h        このヘルプを表示
  --dry-run         投稿はせずに投稿内容をログ出力する
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--filter-prefix': String,
        '--filter-suffix': String,
        '--includes': String,
        '--excludes': String,
        '--sort-date': Boolean,
        '--sort-name': Boolean,
        '--sort-members': Boolean,
        '--asc': Boolean,
        '--desc': Boolean,
        '--show-archived': Boolean,
        '--help': Boolean,
        '--debug': Boolean,
        '--max-members': Number,
        '--min-members': Number,

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
    return;
  }
  if (
    [args['--sort-date'], args['--sort-members'], args['--sort-name']].filter(
      (o) => o
    ).length > 1
  ) {
    Log.error('ソートオプションが複数指定されています。1つにしてください。');
  }
  if ([args['--asc'], args['--desc']].filter((v) => v).length > 1) {
    Log.error('--asc と --desc はどちらか1つだけ指定してください。');
  }

  const prefix = args['--filter-prefix'];
  const suffix = args['--filter-suffix'];
  const includes = args['--includes']?.split(',') || [];
  const excludes = args['--excludes']?.split(',') || [];
  const exculdeArchived = !args['--show-archived'];
  const asc = args['--asc'] ? true : !args['--desc'];
  const maxMembers = args['--max-members'];
  const minMembers = args['--min-members'];

  Log.setDebug(args['--debug']);
  const options = parseOptions(args);

  const channels = (
    await getAllChannels({ exclude_archived: exculdeArchived }, options)
  )
    .filter((c) => !c.is_private)
    .filter((c) => {
      // 両方設定している場合は両方に一致する必要がある
      if (prefix && suffix) {
        return c.name?.startsWith(prefix) && c.name?.endsWith(suffix);
      }
      if (prefix) {
        return c.name?.startsWith(prefix);
      }
      if (suffix) {
        return c.name?.endsWith(suffix);
      }
      return true;
    })
    .filter((c) =>
      includes.length === 0 ? true : includes.find((i) => c.name?.includes(i))
    )
    .filter((c) =>
      excludes.length === 0 ? true : !excludes.find((i) => c.name?.includes(i))
    )
    .filter((c) =>
      maxMembers === undefined ? true : (c.num_members || 0) < maxMembers
    )
    .filter((c) =>
      minMembers === undefined ? true : (c.num_members || 0) > minMembers
    );

  const sortedChannels = orderBy(channels, [
    {
      order: asc ? 'asc' : 'desc',
      property(c) {
        return args['--sort-date']
          ? c.created
          : args['--sort-members']
          ? c.num_members
          : args['--sort-name']
          ? c.name
          : c.name; // default
      },
    },
  ]);

  const maxLength = Math.max(...sortedChannels.map((c) => c.name?.length || 0));
  const numOfDigits = String(
    Math.max(...sortedChannels.map((c) => c.num_members ?? 0))
  ).length;
  const searchText = [
    '',
    includes.length !== 0 ? `含む　　: ${includes.join(' or ')}` : undefined,
    excludes.length !== 0 ? `含まない: ${excludes.join(' and ')}` : undefined,
  ]
    .filter((t) => t)
    .join('\n');
  const filterText = [
    prefix ? `前方一致: ${prefix}` : undefined,
    suffix ? `後方一致: ${suffix}` : undefined,
    maxMembers ? `上限人数: ${maxMembers}` : undefined,
    minMembers !== undefined ? `下限人数: ${minMembers}` : undefined,
  ]
    .filter((t) => t)
    .join('\n');

  Log.success(
    `\n${searchText}\n${filterText}\nパブリックチャンネル一覧（${
      sortedChannels.length
    }）\n${sortedChannels
      .map(
        (c) =>
          c.id?.padEnd(11, ' ') +
          ': ' +
          c.name?.padEnd(maxLength + 1, ' ') +
          `${additionalInfo(c, numOfDigits)}`
      )
      .join('\n')}`
  );
};

const additionalInfo = (c: Channel, numOfDigits: number) => {
  if (!c.members && !c.created && !c.is_archived) return '';
  const num = `${c.num_members}`.padStart(numOfDigits, ' ');
  return `(${num}人, ${convertToSimpleDate(c.created)}${
    c.is_archived ? ', archived' : ''
  })`;
};

const convertToSimpleDate = (created: number | undefined) => {
  if (!created) return '';
  const date = new Date(created * 1000);
  return (
    `${date.getFullYear()}/` +
    `${date.getMonth()}`.padStart(2, '0') +
    '/' +
    `${date.getDay()}`.padStart(2, '0')
  );
};
