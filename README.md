# slack-cli

Slack の投稿を解析することを目的とした CLI です。

## 準備

### 環境変数

設定する必要がある環境変数は Slack 用のユーザートークン（ `SLACK_TOKEN` ）とボットトークン（ `SLACK_BOT_TOKEN` ）の 2 つです。
https://api.slack.com/ にて作成して設定してください。

また、必要に応じて `SLACK_TEAM_ID` も設定することができます。

| 環境変数名         | 必須 | 用途                                                                       |
| :----------------- | :--: | :------------------------------------------------------------------------- |
| SLACK_BOT_TOKEN    |  ⭕  | ボットトークン。Slack API を利用するために必須。                           |
| SLACK_TOKEN        |  ⭕  | ユーザートークン。Slack API をユーザーとして利用する際に利用。             |
| SLACK_TEAM_ID      |  ❌  | Slack の team_id。設定したトークンが複数チームに所属している場合指定する。 |
| OPENAI_API_KEY     |  ❌  | OpenAI の apiKey。summarize 関連のコマンドを使用する際に必須。             |
| OPENAI_API_BASE    |  ❌  | OpenAI の basePath。sumamrize 関連のコマンドを使用する際に必須。           |
| OPENAI_MODEL       |  ❌  | OpenAI の model。デフォルトは 'text-davinci-003'                           |
| OPENAI_API_VERSION |  ❌  | OpenAI の api-version。デフォルトは '2022-12-01'                           |

現状 SLACK_TOKEN も必須となってしまっているのでユーザートークンを使わない場合は SLACK_BOT_TOKEN と同じものを設定してください。

### Slack の必要な権限

権限が足りない場合は Slack Web API から必要なスコープ情報が返ってきます。

事前に全てを網羅することは現実的ではないので、実際にコマンドを実行してみてエラーになったスコープを都度追加してください。

## コマンド

`slack-cli --help` にて一覧を確認できます。

| コマンド名                                                | 概要                                                                                                                 |
| :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| [aggregate:reactions](#aggregate%3Areactions)             | 指定された期間内に指定されたリアクション数が多いユーザーを最大 5 名リストアップする                                  |
| [aggregate:members-reacted](#aggregate%3Amembers-reacted) | 指定された期間内に指定されたリアクションを最も行ったユーザー最大 5 名をリストアップする                              |
| [listup:reactions](#listup%3Areactions)                   | 指定された投稿に付いているリアクションを集計してスレッドに投稿します                                                 |
| [get:channels](#get%3Achannels)                           | チャンネル一覧を出力する。オプションで各種フィルターやソートが使える                                                 |
| [get:members](#get%3Amembers)                             | Slack に参加しているメンバー一覧を出力する。チャンネルを指定するとそのチャンネルに参加しているメンバーのみを出力する |
| [summarize:channel](#summarize%3Achannel)                 | 指定されたチャンネルの直近の投稿を GPT で要約する                                                                    |
| [summarize:member](#summarize%3Amember)                   | 指定されたチャンネル x メンバーの直近の投稿を GPT で要約する                                                         |
| [join:public-channels](#join%3Apublic-channels)           | BOT を全てのパブリックチャンネルに参加させる。ユーザートークンが必須                                                 |
| [--version, -v](#version)                                 | バージョンを表示する                                                                                                 |
| [--help, -h](#help)                                       | ヘルプを表示する                                                                                                     |

### aggregate%3Areactions

```
slack-cli aggregate:reactions --help
# => aggregate:reactions コマンドのヘルプを表示

slack-cli aggregate:reactions --start-date '2022-12-01T00:00:00' --end-date '2023-01-01T00:00:00' --reactions 'stamp-name,ok,+1' --channel-name 'hogehoge'
# => 指定期間内の投稿に対して :stamp-name:, :ok:, :+1: が押された投稿を行ったユーザー毎に集計してトップ5を #hogehoge チャンネルへと投稿する
```

### aggregate%3Amembers-reacted

```
slack-cli aggregate:members-reacted --help
# => aggregate:members-reacted コマンドのヘルプを表示

slack-cli aggregate:members-reacted --start-date 2023-03-28 --reactions "www,+1" --channel-name general
# => 2023年3月28日以降の投稿に :www:, :+1: を行ったユーザーを集計してトップ5を #general チャンネルへと投稿する。

```

### listup%3Areactions

```
slack-cli listup:reactions --help
# => listup:reactions コマンドのヘルプを表示

slack-cli listup:reactions -u https://xxxx.slack.com/archives/XXXXX/p1672724638273089
# => url で指定された投稿に対してその投稿スレッドにリアクションの集計結果を投稿する
```

### get%3Achannels

```
slack-cli get:channels --help
# => get:channels コマンドのヘルプを表示

slack-cli get:channels --filter-prefix hoge --excludes "dev,test"
# => チャンネル名の先頭に hoge が付いて、dev と test という文字列を含まないチャンネル一覧を表示する
```

### get%3Amembers

```
slack-cli get:members --help
# => get:members コマンドのヘルプを表示

slack-cli get:members --channel-name slack-test
# => #slack-test チャンネルに参加しているメンバーの一覧を表示する
```

### summarize%3Achannel

```
slack-cli summarize:channel --help
# => summarize:channel コマンドのヘルプを表示

slack-cli summarize:channel --channel-name slack-test --limit 200
# => #slack-test チャンネルの直近200件の投稿を取得して要約する
```

### summarize%3Amember

```
slack-cli summarize:member --help
# => summarize:member コマンドのヘルプを表示

slack-cli summarize:member --channel-name slack-test --member-id xxx --limit 200
# => #slack-test チャンネルの指定したメンバーの直近200件の投稿を取得して要約する
```

### join%3Apublic-channels

```
slack-cli join:public-channels --help
# => join:public-channels コマンドのヘルプを表示

slack-cli join:public-channels
# => BOT を全てのパブリックチャンネルに参加させる。Slack Web API の reactions を使用している aggregate 関連のコマンドを使用するために必要。
```
