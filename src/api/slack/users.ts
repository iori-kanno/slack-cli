import { UsersListArguments, UsersListResponse } from '@slack/web-api';
import { botClient, userClient } from './index';
import { SlackDemoOptions } from '../../types';

export const getUsersList = async (
  args: UsersListArguments,
  options?: SlackDemoOptions
): Promise<UsersListResponse> => {
  if (options?.asBot) return botClient.users.list(args);
  return userClient.users.list(args);
};
