import { botClient, userClient } from '@/api/slack';
import { SlackDemoOptions } from '@/types';
import { EmojiListArguments, EmojiListResponse } from '@slack/web-api';

export const getEmojiList = async (
  args: EmojiListArguments,
  options?: SlackDemoOptions
): Promise<EmojiListResponse> => {
  if (options?.asBot) return botClient.emoji.list(args);
  return userClient.emoji.list(args);
};

type Emoji = {
  [key: string]: string;
};

export const getAllEmoji = async (
  args: EmojiListArguments,
  options?: SlackDemoOptions
): Promise<Emoji> => {
  const emoji = {};
  let cursor: string | undefined;
  do {
    const res = await getEmojiList({ ...args, cursor }, options);
    cursor = res.response_metadata?.next_cursor;
    Object.entries(res.emoji || {}).forEach(([key, value]) => {
      emoji[key] = value;
    });
  } while (cursor);

  return emoji;
};
