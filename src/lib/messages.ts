export const commandListText = `
Command:
  slack-demo listup:reactions   指定された投稿に付いているリアクションを修正してスレッドに投稿する
  slack-demo --version, -v      slack-demo のバージョンを表示
  slack-demo --help, -h         ヘルプ
  👇  詳細
  TODO: URL か何か
`;

export const listUpMembersHelpText = `
Command:
  slack-demo listup:reactions    指定された投稿に付いているリアクションを修正してスレッドに投稿する

Usage:
  slack-demo listup:reactions [options]

Options:
  --url, -u         指定したい投稿の slack url
  --timestamp, -t   指定したい投稿のタイムスタンプ。url の代わりに指定することができる。-c 必須。
  --channel, -c     指定したい投稿があるチャンネル。url の代わりに指定することができる。-t 必須。

  --help, -h        このヘルプを表示
  --dry-run         投稿はせずに投稿内容をログ出力する
`;

export const invalidOptionText = `⚠️ 不正なオプションが含まれています`;

export const aggregateReactionsHelpText = `
Command:
  slack-demo aggregate:reactions    指定された投稿に付いているリアクションを修正してスレッドに投稿する

Usage:
  slack-demo aggregate:reactions [options]

Options:
  --start-date      集計対象の期間の開始日時。指定例: '2022-12-01T00:00:00'
  --end-date        集計対象の期間の終了日時。指定例: '2022-12-01T00:00:00'
  --reactions       集計対象のリアクション文字列。カンマ区切りで指定する。デフォルト '+1,pray'
  --dry-run         投稿はせずに投稿内容をログ出力する
  --as-user         BOT のトークンを利用せず、ユーザートークンを利用してリクエストを行う。デフォルト false
  --debug           指定した場合デバッグログを出力する
  --help, -h        このヘルプを表示
`;
