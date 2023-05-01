import { Item } from '@slack/web-api/dist/response/ReactionsListResponse';
import * as Log from './log';
import { getAllReactedItems } from '../api/slack/reactions';
import { retrieveAllUser } from '../api/user';
import { ProgressCallback, SlackDemoOptions } from '../types';
import shuffle from 'just-shuffle';

export const aggregateUniqItemsReactedByMembers = async (
  options: SlackDemoOptions,
  progress?: ProgressCallback
) => {
  const users = shuffle(await retrieveAllUser(options));
  progress?.({
    percent: 0,
    message: `${users.length}人分のリアクション履歴を取得します`,
  });

  let items: Item[] = [];
  for (const [index, member] of users.entries()) {
    items.push(
      ...(await getAllReactedItems({ user: member?.id, limit: 500 }, options))
    );
    progress?.({
      percent: ((index + 1) / users.length) * 100,
      message: `${member?.name}のリアクション履歴を取得しました`,
    });
  }
  Log.debug(`集計対象投稿数（重複含む）: ${items.length}`);

  // 重複排除
  const itemMap = new Map(
    items.map((item) => [
      `${item.channel}/${item.type}/${item.message?.ts}/${item.message?.thread_ts}`,
      item,
    ])
  );
  const uniqueItems = [...new Map([...itemMap].sort()).values()];
  Log.debug(
    `items(${items.length}) - uniqueItems(${uniqueItems.length}) = ${
      items.length - uniqueItems.length
    }件重複`
  );
  return uniqueItems;
};
