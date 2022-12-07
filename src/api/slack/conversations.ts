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
