# slack-cli

Slack の投稿を解析することを目的とした CLI です。

## 準備

### 環境変数

設定する必要がある環境変数は Slack 用のユーザートークン（ `SLACK_TOKEN` ）とボットトークン（ `SLACK_BOT_TOKEN` ）の 2 つです。
https://api.slack.com/ にて作成して設定してください。

また、必要に応じて `SLACK_TEAM_ID` も設定することができます。

| 環境変数名      | 必須 | 用途                                                                       |
| :-------------- | :--: | :------------------------------------------------------------------------- |
| SLACK_BOT_TOKEN |  ⭕  | ボットトークン。Slack API を利用するために必須。                           |
| SLACK_TOKEN     |  ❌  | ユーザートークン。Slack API をユーザーとして利用する際に必須。             |
| SLACK_TEAM_ID   |  ❌  | Slack の team_id。設定したトークンが複数チームに所属している場合指定する。 |

### Slack の必要な権限

権限が足りない場合は Slack Web API から必要なスコープ情報が返ってきます。

事前に全てを網羅することは現実的ではないので、実際にコマンドを実行してみてエラーになったスコープを都度追加してください。

## コマンド

`slack-cli --help` にて一覧を確認できます。

| コマンド名                                 | 概要                                                                                |
| :----------------------------------------- | :---------------------------------------------------------------------------------- |
| [aggregate:reactions](#aggregatereactions) | 指定された期間内に指定されたリアクション数が多いユーザーを最大 5 名リストアップする |
| [listup:reactions](#listupreactions)       | 指定された投稿に付いているリアクションを集計してスレッドに投稿します                |

### aggregate:reactions

```
slack-cli aggregate:reactions --help
# => aggregate:reactions コマンドのヘルプを表示

slack-cli aggregate:reactions --start-date '2022-12-01T00:00:00' --end-date '2023-01-01T00:00:00' --reactions 'stamp-name,ok,+1' --channel-name 'hogehoge'
# => 指定期間内の投稿に対して :stamp-name:, :ok:, :+1: が押された投稿を行ったユーザー毎に集計してトップ5を #hogehoge チャンネルへと投稿する
```

### listup:reactions

```
slack-cli listup:reactions --help
# => listup:reactions コマンドのヘルプを表示

slack-cli listup:reactions -u https://xxxx.slack.com/archives/XXXXX/p1672724638273089
# => url で指定された投稿に対してその投稿スレッドにリアクションの集計結果を投稿する
```
