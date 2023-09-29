import arg from 'arg';
import { invalidOptionText } from '../../../lib/messages';
import { CliExecFn } from '../../../types';
import * as Log from '../../../lib/log';
import { parseOptions } from '../../../lib/parser';
import { getAllUsergroups } from '../../../api/slack/usergroups';
import { convertToSimpleDate } from '../../../lib/date';
import orderBy from 'just-order-by';

const helpText = `
\`\`\`
Command:
  get:usergroups    UserGroup一覧を出力する。オプションで各種フィルターやソートが使える。

Usage:
  slack-cli get:usergroups [options]

Options:
  --filter-prefix   名前の前方一致
  --filter-suffix   名前の後方一致
  --includes        名前に含める文字列（,区切りで複数指定可能。その場合の条件は OR）
  --excludes        名前から除外する文字列（,区切りで複数指定可能。その場合の条件は AND）
  --sort-name       名前で並び替えて表示
  --sort-date       日付で並び替えて表示
  --sort-members    メンバー数順に並び替えて表示
  --asc             --sort オプションと一緒に使用。デフォルトは asc
  --desc            --sort オプションと一緒に使用。デフォルトは asc
  --max-members     チャンネルに参加している人数の上限
  --min-members     チャンネルに参加している人数の下限
  --show-archived   アーカイブ済みのチャンネルも表示する。デフォルトは非表示

  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
\`\`\`
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
        '--max-members': Number,
        '--min-members': Number,
        '--sort-date': Boolean,
        '--sort-name': Boolean,
        '--sort-members': Boolean,
        '--asc': Boolean,
        '--desc': Boolean,
        '--show-archived': Boolean,
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

  if (
    [args['--sort-date'], args['--sort-members'], args['--sort-name']].filter(
      (o) => o
    ).length > 1
  ) {
    const error = 'ソートオプションが複数指定されています。1つにしてください。';
    Log.error(error);
    return { error };
  }
  if ([args['--asc'], args['--desc']].filter((v) => v).length > 1) {
    const error = '--asc と --desc はどちらか1つだけ指定してください。';
    Log.error(error);
    return { error };
  }

  const prefix = args['--filter-prefix'];
  const suffix = args['--filter-suffix'];
  const includes = args['--includes']?.split(',') || [];
  const excludes = args['--excludes']?.split(',') || [];
  const exculdeArchived = !args['--show-archived'];
  const asc = args['--asc'] ? true : !args['--desc'];
  const maxMembers = args['--max-members'];
  const minMembers = args['--min-members'];

  const usergroups = (
    await getAllUsergroups(
      {
        include_count: true,
        include_disabled: !exculdeArchived,
        include_users: true,
      },
      { ...options, asBot: false }
    )
  )
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
      includes.length === 0 ? true : includes.some((i) => c.name?.includes(i))
    )
    .filter((c) =>
      excludes.length === 0 ? true : !excludes.some((i) => c.name?.includes(i))
    )
    .filter((c) =>
      maxMembers === undefined ? true : (c.user_count || 0) < maxMembers
    )
    .filter((c) =>
      minMembers === undefined ? true : (c.user_count || 0) > minMembers
    );

  const sortedUsergroups = orderBy(usergroups, [
    {
      order: asc ? 'asc' : 'desc',
      property(ug) {
        return args['--sort-date']
          ? ug.date_create
          : args['--sort-members']
          ? ug.user_count
          : args['--sort-name']
          ? ug.name
          : ug.name; // default
      },
    },
  ]);
  const maxLength = Math.max(
    ...sortedUsergroups.map((ug) => ug.name?.length || 0)
  );
  const numOfDigits = String(
    Math.max(...sortedUsergroups.map((ug) => ug.prefs?.channels?.length ?? 0))
  ).length;

  const searchText = [
    includes.length !== 0 ? `含む　　: ${includes.join(' or ')}` : undefined,
    excludes.length !== 0 ? `含まない: ${excludes.join(' and ')}` : undefined,
  ]
    .filter((t) => t)
    .join('\n');
  const filterText = [
    prefix ? `前方一致: ${prefix}` : undefined,
    suffix ? `後方一致: ${suffix}` : undefined,
    maxMembers !== undefined ? `上限人数: ${maxMembers}` : undefined,
    minMembers !== undefined ? `下限人数: ${minMembers}` : undefined,
  ]
    .filter((t) => t)
    .join('\n');

  const response = `${[searchText, filterText]
    .filter((t) => t)
    .join('\n')}\nユーザーグループ一覧 (${
    usergroups.length
  })\n${sortedUsergroups
    .map(
      (ug) =>
        `${ug.id?.padEnd(11, ' ')}: ${ug.name?.padEnd(
          maxLength + 1,
          ' '
        )} (${String(ug.user_count || 0).padStart(2, ' ')}人, ${String(
          ug.prefs?.channels?.length || 0
        ).padStart(numOfDigits, ' ')}チャンネル, ${convertToSimpleDate(
          ug.date_create
        )}${
          ug.date_delete ? ', 削除済' + convertToSimpleDate(ug.date_delete) : ''
        })`
    )
    .join('\n')}`;

  if (options.dryRun) {
    Log.success(response);
    return;
  }
  return { text: '```\n' + response + '\n```' };
};
