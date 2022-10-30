import {
  ChatPostMessageArguments,
  ChatPostMessageResponse,
} from '@slack/web-api';
import { botClient, userClient } from './index';
import { SlackDemoOptions } from '../../types';

// postMessage だと別のものに補完されてしまうので変更
export const postMessageToSlack = async (
  args: ChatPostMessageArguments,
  options?: SlackDemoOptions
): Promise<ChatPostMessageResponse> => {
  if (options?.asBot) return botClient.chat.postMessage(args);
  return userClient.chat.postMessage(args);
};
