import { Log } from '@/lib/log';
import { ChannelCache, UserCache } from './types';

let usersCache: UserCache[] = [];
let channelsCache: ChannelCache[] = [];

export const getUsersCache = (): Readonly<UserCache[]> => usersCache;
export const getChannelsCache = (): Readonly<ChannelCache[]> => channelsCache;

export const findUserCache = (id: string): Readonly<UserCache | undefined> =>
  usersCache.find((u) => u.id === id);
export const findChannelCache = (
  id: string
): Readonly<ChannelCache | undefined> => channelsCache.find((c) => c.id === id);

export const makeUsersCache = async (client) => {
  let users: UserCache[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.users.list({
      limit: 500,
      cursor,
    });
    cursor = res.response_metadata?.next_cursor;
    users.push(
      ...(res.members
        ?.filter((m) => m.id && (m.name || m.real_name))
        .map((m) => ({ id: m.id!, name: m.name, realName: m.real_name })) || [])
    );
  } while (cursor);

  usersCache = users;
};

export const makeChannelsCache = async (client) => {
  let channels: ChannelCache[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.conversations.list({
      limit: 500,
      exclude_archived: false,
      cursor,
    });
    cursor = res.response_metadata?.next_cursor;
    channels.push(
      ...(res.channels
        ?.filter((c) => c.id && c.name)
        .map((c) => ({ id: c.id!, name: c.name! })) || [])
    );
  } while (cursor);

  channelsCache = channels;
};

export const dumpMemoryUsage = () => {
  Log.debug('⚡️ dumpMemoryUsage');
  try {
    const heap = process.memoryUsage();
    const msg = Object.entries(heap).map(
      ([key, value]) => `${key}: ${Math.round(value / 1024 / 1024)} MB`
    );
    Log.success(`${new Date().toLocaleString()}: ` + msg.join(', '));
  } catch (e) {
    Log.error(e);
  }
};
