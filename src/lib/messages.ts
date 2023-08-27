export const commandListText = `
\`\`\`
Command:
  slack-cli aggregate:members-reacted 指定された期間内に指定されたリアクションを最も行ったユーザー最大5名をリストアップする
  slack-cli aggregate:reactions       指定された期間内に指定されたリアクション数が多いユーザーを最大5名リストアップする
  slack-cli delete:message            指定された投稿を削除する（この BOT が投稿したもののみ）
  slack-cli get:channels              チャンネル一覧を表示する
  slack-cli get:members               メンバー一覧を表示する
  slack-cli get:usergroups            ユーザーグループ一覧を表示する
  slack-cli get:usergroups:members    指定された Usergroup に属するメンバー一覧を出力する。
  slack-cli join:public-channels      BOT を全てのパブリックチャンネルに参加させる。ユーザートークンが必須。（slash-command の場合使用不可）
  slack-cli listup:reactions          指定された投稿に付いているリアクションを集計してスレッドに投稿する
  slack-cli summarize:channel         指定されたチャンネルの直近の投稿を GPT で要約する
  slack-cli summarize:member          指定されたユーザーの直近の投稿を GPT で要約する
  slack-cli --version, -v             slack-cli のバージョンを表示する
  slack-cli --help, -h                ヘルプを表示する
  👇  詳細
  TODO: URL か何か
\`\`\`
`;

export const invalidOptionText = `⚠️ 不正なオプションが含まれています`;
