import { Member } from '@slack/web-api/dist/response/UsersListResponse';
import compact from 'just-compact';
import { SlackDemoOptions } from '../types';
import { getAllUsers } from './slack/users';

const cachedMap: Record<string, Member | undefined> = {};

const makeCache = async (options?: SlackDemoOptions) => {
  const members = await getAllUsers(
    {
      limit: 300,
    },
    options
  );
  members?.forEach((member) => {
    if (member.id) {
      cachedMap[member.id] = member;
    }
  });
};

export const retrieveAllUser = async (
  options?: SlackDemoOptions
): Promise<Member[]> => {
  if (Object.keys(cachedMap).length == 0) {
    await makeCache(options);
  }
  return compact(Object.values(cachedMap));
};

export const mapUserIdsToMembers = async (
  userIds: string[],
  options?: SlackDemoOptions
): Promise<Member[]> => {
  const ids = Array.from(new Set(userIds));
  if (Object.keys(cachedMap).length == 0) {
    await makeCache(options);
  }
  return compact(ids.map((id) => cachedMap[id]));
};

export const mapUserIdToMember = async (
  userId: string,
  options?: SlackDemoOptions
): Promise<Member | undefined> => {
  if (Object.keys(cachedMap).length == 0) {
    await makeCache(options);
  }
  return cachedMap[userId];
};

export const mapUserNameToMember = async (
  userName: string,
  options?: SlackDemoOptions
): Promise<Member | undefined> => {
  if (Object.keys(cachedMap).length == 0) {
    await makeCache(options);
  }
  return Object.values(cachedMap).find(
    (m) => m?.name === userName || m?.real_name === userName
  );
};
