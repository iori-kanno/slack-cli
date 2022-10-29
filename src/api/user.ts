import { Member } from '@slack/web-api/dist/response/UsersListResponse';
import compact from 'just-compact';
import { client } from './index';

const cachedMap: Record<string, Member | undefined> = {};

const makeCache = async () => {
  const users = await client.users.list({
    limit: 300,
  });
  users.members?.forEach((member) => {
    if (member.id) {
      cachedMap[member.id] = member;
    }
  });
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
