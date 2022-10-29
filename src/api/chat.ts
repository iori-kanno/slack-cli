import {
  ChatPostMessageArguments,
  ChatPostMessageResponse,
} from '@slack/web-api';
import { client } from './index';

export const postMessage = async (
  message: ChatPostMessageArguments
): Promise<ChatPostMessageResponse | undefined> => {
  try {
    return await client.chat.postMessage(message);
  } catch (e) {
    console.error(e);
  }
};
