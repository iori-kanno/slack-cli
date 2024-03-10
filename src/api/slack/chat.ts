import { botClient, userClient } from '@/api/slack';
import { SlackDemoOptions } from '@/types';
import {
  ChatDeleteArguments,
  ChatDeleteResponse,
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  ChatUpdateArguments,
  ChatUpdateResponse,
} from '@slack/web-api';

// postMessage だと別のものに補完されてしまうので変更
export const postMessageToSlack = async (
  args: ChatPostMessageArguments,
  options?: SlackDemoOptions
): Promise<ChatPostMessageResponse> => {
  if (options?.asBot) return botClient.chat.postMessage(args);
  return userClient.chat.postMessage(args);
};

export const deleteMessage = async (
  args: ChatDeleteArguments,
  options?: SlackDemoOptions
): Promise<ChatDeleteResponse> => {
  if (options?.asBot) return botClient.chat.delete(args);
  return userClient.chat.delete(args);
};

export const updateMessage = async (
  args: ChatUpdateArguments,
  options?: SlackDemoOptions
): Promise<ChatUpdateResponse> => {
  if (options?.asBot) return botClient.chat.update(args);
  return userClient.chat.update(args);
};
