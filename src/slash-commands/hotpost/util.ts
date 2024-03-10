import { Log } from '@/lib/log';
import { getBotOption } from '../app';
import { Hotpost } from './types';

export const isHotpost = (hotpost: Hotpost) => {
  const option = getBotOption();
  if (option.isDev) {
    return hotpost.reactionCount >= 4 && hotpost.usersCount >= 1;
  }

  return hotpost.reactionCount >= 20 && hotpost.usersCount >= 5;
};

export const isEarlypost = (hotpost: Hotpost) => {
  const option = getBotOption();
  if (option.isDev) {
    return hotpost.reactionCount >= 2 && hotpost.usersCount >= 1;
  }

  return hotpost.reactionCount >= 5 && hotpost.usersCount >= 2;
};

export const buildUrl = async (client, hotpost: Hotpost) =>
  getPermalink(client, hotpost.channel, hotpost.ts);

export const getPermalink = async (client, channel: string, ts: string) => {
  const res = await client.chat.getPermalink({
    channel,
    message_ts: ts,
  });
  Log.debug('getPermalink', res);
  if (!res.ok)
    return `https://slack.com/archives/${channel}/p${ts.replace('.', '')}`;
  return res.permalink;
};
