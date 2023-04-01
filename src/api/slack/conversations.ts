import { botClient, userClient } from './index';
import { SlackDemoOptions } from '../../types';
import {
  ConversationsHistoryArguments,
  ConversationsHistoryResponse,
  ConversationsListArguments,
  ConversationsListResponse,
  ConversationsRepliesArguments,
  ConversationsRepliesResponse,
} from '@slack/web-api';
import { Message } from '@slack/web-api/dist/response/ConversationsHistoryResponse';
import * as Log from '../../lib/log';

/** 特定チャンネルへの投稿一覧 */
export const getHistoriesList = async (
  args: ConversationsHistoryArguments,
  options?: SlackDemoOptions
): Promise<ConversationsHistoryResponse> => {
  if (options?.asBot) return botClient.conversations.history(args);
  return userClient.conversations.history(args);
};

/** 返信一覧 */
export const getRepliesList = async (
  args: ConversationsRepliesArguments,
  options?: SlackDemoOptions
): Promise<ConversationsRepliesResponse> => {
  if (options?.asBot) return botClient.conversations.replies(args);
  return userClient.conversations.replies(args);
};

/** チャンネル一覧 */
export const getChannelsList = async (
  args: ConversationsListArguments,
  options?: SlackDemoOptions
): Promise<ConversationsListResponse> => {
  if (options?.asBot) return botClient.conversations.list(args);
  return userClient.conversations.list(args);
};

// ----
/** 特定チャンネルの投稿一覧に加えてスレッドの投稿も取得して返す。並びは時系列順で、スレッドの投稿は元の投稿の後に全て連なる。 */
export const getAllConversations = async (
  args: ConversationsHistoryArguments,
  convLimit: number,
  memberIdsPosted?: string[],
  options?: SlackDemoOptions
): Promise<Message[]> => {
  Log.debug(
    `start to fetch slack posts and threads from a channel (limit: ${convLimit})`
  );
  const messages = Array<Message>();
  let cursor: string | undefined;
  do {
    Log.debug(`\t\tcursor: ${cursor}, args: ${JSON.stringify(args)}`);
    const res = await getHistoriesList({ ...args, cursor }, options);
    Log.debug(
      `\t\titem count: ${res.messages?.length} (thread: ${
        res.messages?.filter((m) => m.thread_ts).length
      })`
    );
    cursor = res.response_metadata?.next_cursor;
    for (const m of res.messages || []) {
      // スレッドがあれば、そのスレッドの投稿も取得する
      // ただし、memberIdsPosted が指定されている場合は、そのユーザーの投稿のみ取得する
      if (
        m.thread_ts &&
        (memberIdsPosted === undefined ||
          memberIdsPosted?.find((id) =>
            m.reply_users?.some((rid) => rid === id)
          ))
      ) {
        // 取得したスレッドの投稿は、元の投稿の後に連なるように逆順にして追加する
        messages.push(
          ...(
            await getAllReplies(
              { channel: args.channel, ts: m.thread_ts },
              memberIdsPosted,
              options
            )
          ).reverse()
        );
      } else {
        if (
          memberIdsPosted === undefined ||
          memberIdsPosted?.includes(m.user ?? '')
        )
          messages.push(m);
      }
    }
  } while (cursor && convLimit > messages.length);

  // 時系列順（降順）にするため逆順にして返す
  return messages.reverse();
};

export const getAllReplies = async (
  args: ConversationsRepliesArguments,
  memberIdsPosted?: string[],
  options?: SlackDemoOptions
): Promise<Message[]> => {
  const messages = Array<Message>();
  let cursor: string | undefined;
  do {
    const res = await getRepliesList({ ...args, cursor }, options);
    cursor = res.response_metadata?.next_cursor;
    messages.push(
      ...(res.messages?.filter(
        (m) =>
          memberIdsPosted === undefined ||
          memberIdsPosted.includes(m.user ?? '')
      ) || [])
    );
  } while (cursor);

  return messages;
};
