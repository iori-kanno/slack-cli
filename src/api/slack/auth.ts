import { botClient, userClient } from '@/api/slack';
import { SlackDemoOptions } from '@/types';
import {
  AuthTestArguments,
  AuthTestResponse,
  BotsInfoArguments,
  BotsInfoResponse,
} from '@slack/web-api';

export const fetchMe = async (
  args: AuthTestArguments,
  options?: SlackDemoOptions
): Promise<AuthTestResponse> => {
  if (options?.asBot) return botClient.auth.test(args);
  return userClient.auth.test(args);
};

export const fetchBotInfo = async (
  args: BotsInfoArguments
): Promise<BotsInfoResponse> => {
  return botClient.bots.info(args);
};
