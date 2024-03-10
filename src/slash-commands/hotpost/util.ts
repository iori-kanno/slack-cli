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

export const buildUrl = (hotpost: Hotpost) => {
  return `https://${getBotOption().slackDomain}/archives/${
    hotpost.channel
  }/p${hotpost.ts.replace('.', '')}`;
};
