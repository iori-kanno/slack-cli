import { Log } from '@/lib/log';
import { Hotpost } from '../../hotpost/types';
import { getDb } from './initializer';

interface RowData {
  id: number;
  channel: string;
  ts: string;
  reaction_count: number;
  reactions: string;
  users_count: number;
  users: string;
  is_early: number;
  is_hot: number;
  updated_at: number;
}

const mapRowToHotpost = (row: RowData): Hotpost => ({
  id: row.id,
  channel: row.channel,
  ts: row.ts,
  reactionCount: row.reaction_count,
  reactions: JSON.parse(row.reactions),
  usersCount: row.users_count,
  users: row.users.split(','),
  isEarly: row.is_early === 1,
  isHot: row.is_hot === 1,
  updatedAt: row.updated_at,
});

export const createHotpost = async (hotpost: Hotpost) => {
  Log.debug('⚡️ createHotpost');
  const db = await getDb();
  db.serialize(() => {
    db.run(
      'INSERT INTO hotposts (channel, ts, reaction_count, reactions, users_count, users, is_early, is_hot, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      hotpost.channel,
      hotpost.ts,
      hotpost.reactionCount,
      JSON.stringify(hotpost.reactions),
      hotpost.usersCount,
      hotpost.users.join(','),
      hotpost.isEarly ? 1 : 0,
      hotpost.isHot ? 1 : 0,
      hotpost.updatedAt
    );
  });
  db.close();
};

export const updateHotpost = async (hotpost: Hotpost, updatedAt?: number) => {
  Log.debug('⚡️ updateHotpost');
  hotpost.updatedAt = updatedAt || Date.now();
  const db = await getDb();
  db.serialize(() => {
    db.run(
      'UPDATE hotposts SET reaction_count = ?, reactions = ?, users_count = ?, users = ?, is_early = ?, is_hot = ?, updated_at = ? WHERE channel = ? AND ts = ?',
      hotpost.reactionCount,
      JSON.stringify(hotpost.reactions),
      hotpost.usersCount,
      hotpost.users.join(','),
      hotpost.isEarly ? 1 : 0,
      hotpost.isHot ? 1 : 0,
      hotpost.updatedAt,
      hotpost.channel,
      hotpost.ts
    );
  });
  db.close();
};

export const getHotpost = async (
  channel: string,
  ts: string
): Promise<Hotpost | undefined> => {
  Log.debug('⚡️ getHotpost');
  const db = await getDb();
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM hotposts WHERE channel = ? AND ts = ?',
      [channel, ts],
      (err, row: RowData) => {
        Log.debug('\t\trow = ', row);
        if (err) {
          Log.error(err);
          resolve(undefined);
        }
        if (!row) {
          resolve(undefined);
          return;
        }
        resolve(mapRowToHotpost(row));
      }
    );
    db.close();
  });
};

export const deleteHotpost = async (channel: string, ts: string) => {
  Log.debug('⚡️ deleteHotpost');
  const db = await getDb();
  db.serialize(() => {
    db.run('DELETE FROM hotposts WHERE channel = ? AND ts = ?', channel, ts);
  });
  db.close();
};

export const getHotpostList = async (
  offset: number,
  limit: number = 100
): Promise<Hotpost[]> => {
  Log.debug('⚡️ getHotpostList');
  const db = await getDb();
  return new Promise((resolve) => {
    db.all(
      'SELECT * FROM hotposts ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [limit, offset],
      (err, rows: RowData[]) => {
        if (err) {
          Log.error(err);
          resolve([]);
        }
        resolve(rows.map((row) => mapRowToHotpost(row)));
      }
    );
    db.close();
  });
};

export const deleteHotpostList = async (hotposts: Hotpost[]) => {
  Log.debug('⚡️ deleteHotpostList', hotposts.length);
  const db = await getDb();
  db.serialize(() => {
    for (const hotpost of hotposts) {
      db.run(
        'DELETE FROM hotposts WHERE channel = ? AND ts = ?',
        hotpost.channel,
        hotpost.ts
      );
    }
  });
  db.close();
};
