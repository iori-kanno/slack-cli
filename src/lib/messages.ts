export const commandListText = `
Command:
  slack-cli aggregate:reactions       指定された期間内に指定されたリアクション数が多いユーザーを最大5名リストアップする
  slack-cli aggregate:members-reacted 指定された期間内に指定されたリアクションを最も行ったユーザー最大5名をリストアップする
  slack-cli get:channels              チャンネル一覧を表示する
  slack-cli get:members               メンバー一覧を表示する
  slack-cli listup:reactions          指定された投稿に付いているリアクションを集計してスレッドに投稿する
  slack-cli summarize:channel         指定されたチャンネルの直近の投稿を GPT で要約する
  slack-cli summarize:user            指定されたユーザーの直近の投稿を GPT で要約する
  slack-cli join:public-channels      BOT を全てのパブリックチャンネルに参加させる。ユーザートークンが必須。
  slack-cli --version, -v             slack-cli のバージョンを表示する
  slack-cli --help, -h                ヘルプを表示する
  👇  詳細
  TODO: URL か何か
`;

export const invalidOptionText = `⚠️ 不正なオプションが含まれています`;
