import {
  UsergroupsListArguments,
  UsergroupsListResponse,
  UsergroupsUsersListArguments,
  UsergroupsUsersListResponse,
} from '@slack/web-api';
import { botClient, userClient } from './index';
import { SlackDemoOptions } from '../../types';
import { Usergroup } from '@slack/web-api/dist/response/UsergroupsListResponse';

export const getUsergroupList = async (
  args: UsergroupsListArguments,
  options?: SlackDemoOptions
): Promise<UsergroupsListResponse> => {
  if (options?.asBot) return botClient.usergroups.list(args);
  return userClient.usergroups.list(args);
};

// 型定義にないけど、APIのレスポンスには含まれるので追加しておく
type UsergroupWithUserCount = Usergroup & { user_count: number };

export const getAllUsergroups = async (
  args: UsergroupsListArguments,
  options?: SlackDemoOptions
): Promise<UsergroupWithUserCount[]> => {
  const userGroups = Array<UsergroupWithUserCount>();
  let cursor: string | undefined;
  do {
    const res = await getUsergroupList(
      { include_users: true, include_count: true, ...args, cursor },
      options
    );
    cursor = res.response_metadata?.next_cursor;
    userGroups.push(
      ...(res.usergroups?.map((ug) => ({ user_count: 0, ...ug })) || [])
    );
  } while (cursor);

  return userGroups;
};

export const getUsergroupsMembers = async (
  args: UsergroupsUsersListArguments,
  options?: SlackDemoOptions
): Promise<UsergroupsUsersListResponse> => {
  if (options?.asBot) return botClient.usergroups.users.list(args);
  return userClient.usergroups.users.list(args);
};
