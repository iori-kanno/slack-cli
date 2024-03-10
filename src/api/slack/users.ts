import { botClient, userClient } from '@/api/slack';
import { SlackDemoOptions } from '@/types';
import { UsersListArguments, UsersListResponse } from '@slack/web-api';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';

export const getUsersList = async (
  args: UsersListArguments,
  options?: SlackDemoOptions
): Promise<UsersListResponse> => {
  if (options?.asBot) return botClient.users.list(args);
  return userClient.users.list(args);
};

export const getAllUsers = async (
  args: UsersListArguments,
  options?: SlackDemoOptions
): Promise<Member[]> => {
  const members = Array<Member>();
  let cursor: string | undefined;
  do {
    const res = await getUsersList({ ...args, cursor }, options);
    cursor = res.response_metadata?.next_cursor;
    members.push(...(res.members || []));
  } while (cursor);

  return members;
};
