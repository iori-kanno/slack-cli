import { Hotpost } from './types';
import * as Log from '../../lib/log';

export const fetchAndCreateHotpost = async (
  client,
  channel: string,
  ts: string,
  updatedAt: number
) => {
  Log.debug('⚡️ fetchAndCreateHotpost');
  // NOTE: getPermalink で tread_ts があるかないかで判定しないとうまくいかない
  const res = await client.conversations.history({
    channel,
    latest: ts,
    inclusive: true,
    limit: 1,
  });
  if (!res.ok) return undefined;
  if (!res.messages && !res.messages.length) return undefined;

  Log.debug('  \t', res);
  if (!res.messages[0].thread_ts) {
    Log.debug('  \tNot have threads', res.messages.reactions);
    const reactions = res.messages.reduce((acc, m) => {
      if (m.reactions) {
        m.reactions.forEach((r) => {
          acc[r.name] = r.count;
        });
      }
      return acc;
    }, {}) as Hotpost['reactions'];
    const users = res.messages.reduce((acc, m) => {
      if (m.reactions) {
        m.reactions.forEach((r) => {
          acc = Array.from(new Set([...acc, ...r.users]));
        });
      }
      return acc;
    }, []) as Hotpost['users'];
    return {
      channel,
      ts,
      reactions,
      reactionCount: Object.values(reactions).reduce((acc, v) => acc + v, 0),
      users,
      usersCount: users.length,
      isEarly: false,
      isHot: false,
      updatedAt,
    } as Hotpost;
  }

  const threadRes = await client.conversations.replies({
    channel,
    ts: res.messages[0].thread_ts,
  });
  if (!threadRes.ok) return undefined;
  if (!threadRes.messages && !threadRes.messages.length) return undefined;

  Log.debug('  \tHave threads: ', threadRes.messages.length);
  const reactions = threadRes.messages.reduce((acc, m) => {
    Log.debug('  \t\t', m.reactions);
    if (m.reactions) {
      m.reactions.forEach((r) => {
        acc[r.name] = r.count;
      });
    }
    return acc;
  }, {}) as Hotpost['reactions'];
  const users = threadRes.messages.reduce((acc, m) => {
    if (m.reactions) {
      m.reactions.forEach((r) => {
        acc = Array.from(new Set([...acc, ...r.users]));
      });
    }
    return acc;
  }, []) as Hotpost['users'];
  return {
    channel,
    ts,
    reactions,
    reactionCount: Object.values(reactions).reduce((acc, v) => acc + v, 0),
    users,
    usersCount: users.length,
    isEarly: false,
    isHot: false,
    updatedAt,
  } as Hotpost;
};
