## emoji.json

システムの絵文字は Slack の emoji.list では取得できないのでシステムの絵文字と key をマッピングする必要があるため、このファイルでそれを行う。

追加する場合はソートすると良さそうなので jq を使う。

```
cat src/lib/assets/emoji.json | jq -S
```
