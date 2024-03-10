import { botClient, userClient } from '@/api/slack';
import { SlackDemoOptions } from '@/types';
import {
  ConversationsHistoryArguments,
  ConversationsHistoryResponse,
  ConversationsListArguments,
  ConversationsListResponse,
  ConversationsRepliesArguments,
  ConversationsRepliesResponse,
} from '@slack/web-api';
import { Message } from '@slack/web-api/dist/response/ConversationsHistoryResponse';
import { Log } from '@/lib/log';

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
  shouldFetchReplies: boolean | ((m: Message) => boolean),
  options?: SlackDemoOptions
): Promise<Message[]> => {
  Log.debug(
    `start to fetch slack posts and threads from a channel (limit: ${convLimit})`
  );
  const messages = Array<Message>();
  let cursor: string | undefined;
  do {
    Log.debug(`\t\tcursor: ${cursor}, args: ${JSON.stringify(args)}`);
    const res = await getHistoriesList(
      { exclude_archived: true, ...args, cursor },
      options
    );
    Log.debug(
      `\t\titem count: ${res.messages?.length} (thread: ${
        res.messages?.filter((m) => m.thread_ts).length
      })`
    );
    cursor = res.response_metadata?.next_cursor;
    for (const m of res.messages || []) {
      if (
        m.type !== 'message' ||
        m.subtype === 'channel_leave' ||
        m.subtype === 'channel_join'
      )
        continue;
      // スレッドがあれば、そのスレッドの投稿も取得する
      // ただし、shouldFetchReplies によってはスレッドの投稿を取得しない場合もある
      const fetchReplies =
        typeof shouldFetchReplies === 'boolean'
          ? shouldFetchReplies
          : shouldFetchReplies(m);
      if (m.thread_ts && fetchReplies) {
        // 取得したスレッドの投稿は、元の投稿の後に連なるように逆順にして追加する
        const threads = (
          await getAllReplies(
            { channel: args.channel, ts: m.thread_ts },
            options
          )
        ).reverse();
        messages.push(...threads);
        Log.debug(`\t\tfetched thread: ${m.thread_ts} (${threads.length})`);
      } else {
        messages.push(m);
      }
    }
  } while (cursor && convLimit > messages.length);

  // 時系列順（降順）にするため逆順にして返す
  return messages.reverse();
};

export const getAllReplies = async (
  args: ConversationsRepliesArguments,
  options?: SlackDemoOptions
): Promise<Message[]> => {
  const messages = Array<Message>();
  let cursor: string | undefined;
  do {
    const res = await getRepliesList({ ...args, cursor }, options);
    cursor = res.response_metadata?.next_cursor;
    messages.push(...(res.messages || []));
  } while (cursor);

  return messages;
};
