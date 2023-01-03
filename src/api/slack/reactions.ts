import {
  ReactionsGetArguments,
  ReactionsGetResponse,
  ReactionsListArguments,
  ReactionsListResponse,
} from '@slack/web-api';
import { botClient, userClient } from './index';
import { SlackDemoOptions } from '../../types';
import * as Log from '../../lib/log';
import { Item } from '@slack/web-api/dist/response/ReactionsListResponse';
import { convertTsToDate, isWithinByDate } from '../../lib/helper';
import { mapUserIdToMember } from '../user';

export const getReactions = async (
  args: ReactionsGetArguments,
  options?: SlackDemoOptions
): Promise<ReactionsGetResponse> => {
  if (options?.asBot) return botClient.reactions.get(args);
  return userClient.reactions.get(args);
};

export const getReactionsList = async (
  args: ReactionsListArguments,
  options?: SlackDemoOptions
): Promise<ReactionsListResponse> => {
  if (options?.asBot) return botClient.reactions.list(args);
  return userClient.reactions.list(args);
};

export const getAllReactedItems = async (
  args: ReactionsListArguments,
  options?: SlackDemoOptions
): Promise<Item[]> => {
  const user = await mapUserIdToMember(args.user || '');
  const items = Array<Item>();
  let cursor: string | undefined;
  let emptyCount = 0;
  do {
    const res = await getReactionsList(
      { limit: 800, full: true, ...args, cursor },
      options
    );
    cursor = res.response_metadata?.next_cursor;
    // 期間が設定されていたらフィルターする
    const newItems =
      (options?.startDate || options?.endDate
        ? res.items?.filter((item) => {
            if (item.message?.ts) {
              return isWithinByDate(
                convertTsToDate(item.message.ts),
                options?.startDate,
                options?.endDate
              );
            }
            return false;
          })
        : res.items) || [];
    items.push(...newItems);
    Log.debug(
      `added ${newItems.length} / ${(res.items ?? []).length} items for ${
        user?.real_name || user?.name
      } (${user?.id})`
    );
    // TODO: エラーになるケースを特定して特殊対応をなくす
    if (args.user === 'U01U4B66VBM') {
      // フジタくんのばあいここで終わりにする
      break;
    }
    if ((res.items ?? []).length > 0 && newItems.length == 0) {
      emptyCount += 1;
    }
    if (emptyCount > 1) {
      cursor = undefined;
      Log.debug(' ... 追加取得を停止します');
    }
  } while (cursor);

  return items;
};
