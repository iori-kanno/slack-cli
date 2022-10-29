export const commandListText = `
Command:
  slack-demo listup-members   指定された投稿に付いているリアクションを修正してスレッドに投稿する
  slack-demo --version, -v    slack-demo のバージョンを表示
  slack-demo --help, -h       ヘルプ
  👇  詳細
  TODO: URL か何か
`;

export const listUpMembersHelpText = `
Command:
  slack-demo listup-members    指定された投稿に付いているリアクションを修正してスレッドに投稿する

Usage:
  slack-demo listup-members [options]

Options:
  --url, -u         指定したい投稿の slack url
  --timestamp, -t   指定したい投稿のタイムスタンプ。url の代わりに指定することができる。-c 必須。
  --channel, -c     指定したい投稿があるチャンネル。url の代わりに指定することができる。-t 必須。

  --help, -h        このヘルプを表示
  --dry-run         投稿はせずに投稿内容をログ出力する
`;

export const invalidOptionText = `⚠️ 不正なオプションが含まれています`;
