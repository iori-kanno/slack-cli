import { ReactionsGetArguments, ReactionsGetResponse } from '@slack/web-api';
import { botClient, userClient } from './index';
import { SlackDemoOptions } from '../../types';

export const getReactions = async (
  args: ReactionsGetArguments,
  options?: SlackDemoOptions
): Promise<ReactionsGetResponse> => {
  if (options?.asBot) return botClient.reactions.get(args);
  return userClient.reactions.get(args);
};
