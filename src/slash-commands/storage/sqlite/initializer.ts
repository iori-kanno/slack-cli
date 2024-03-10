/**
 * SQLite3
 * DB slack-cli.db
 * TABLE hotposts
 *  id INTEGER PRIMARY KEY autoincrement
 *  channel TEXT
 *  ts TEXT
 *  reaction_count INTEGER
 *  reactions TEXT
 *  users_count INTEGER
 *  users TEXT
 *  is_early INTEGER
 *  is_hot INTEGER
 *  updated_at INTEGER
 * INDEX idx_hotposts_channel_ts ON hotposts(channel, ts)
 */

import sqlite3 from 'sqlite3';

export const getDb = async () => {
  const db = new (sqlite3.verbose().Database)('./slack-cli.db');
  await new Promise<void>((resolve) => {
    db.serialize(() => {
      db.run(
        'CREATE TABLE IF NOT EXISTS hotposts (id INTEGER PRIMARY KEY autoincrement, channel TEXT, ts TEXT, reaction_count INTEGER, reactions TEXT, users_count INTEGER, users TEXT, is_early INTEGER, is_hot INTEGER, updated_at INTEGER) STRICT'
      );
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_hotposts_channel_ts ON hotposts(channel, ts)'
      );
      resolve();
    });
  });
  return db;
};
