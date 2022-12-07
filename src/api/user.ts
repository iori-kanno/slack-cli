import { Member } from '@slack/web-api/dist/response/UsersListResponse';
import compact from 'just-compact';
import { getAllUsers } from './slack/users';

const cachedMap: Record<string, Member | undefined> = {};

const makeCache = async () => {
  const members = await getAllUsers({
    limit: 300,
  });
  members?.forEach((member) => {
    if (member.id) {
      cachedMap[member.id] = member;
    }
  });
};

export const retrieveAllUser = async (): Promise<Member[]> => {
  if (Object.keys(cachedMap).length == 0) {
    await makeCache();
  }
  return compact(Object.values(cachedMap));
};

export const mapUserIdsToMembers = async (
  userIds: string[]
): Promise<Member[]> => {
  const ids = Array.from(new Set(userIds));
  if (Object.keys(cachedMap).length == 0) {
    await makeCache();
  }
  return compact(ids.map((id) => cachedMap[id]));
};

export const mapUserIdToMember = async (
  userId: string
): Promise<Member | undefined> => {
  if (Object.keys(cachedMap).length == 0) {
    await makeCache();
  }
  return cachedMap[userId];
};

export const mapUserNameToMember = async (
  userName: string
): Promise<Member | undefined> => {
  if (Object.keys(cachedMap).length == 0) {
    await makeCache();
  }
  return Object.values(cachedMap).find(
    (m) => m?.name === userName || m?.real_name === userName
  );
};
