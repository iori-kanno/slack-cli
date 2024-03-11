import { replaceTsToNumber } from '@/lib/helper';
import { Log } from '@/lib/log';
import { getBotOption } from '../app';
import { findChannelCache, findUserCache } from '../storage/memory';
import { createHotpost, getHotpost, updateHotpost } from '../storage/sqlite';
import { Hotpost } from './types';
import { buildUrl, isEarlypost, isHotpost } from './util';

export const handleHotpost = async ({ event, client, ...args }) => {
  Log.success(
    '⚡️ handleHotpost',
    `date: ${new Date(replaceTsToNumber(event.event_ts)).toLocaleString()}`,
    `channel: ${findChannelCache(event.item.channel)?.name}`,
    `user: ${findUserCache(event.user)?.name}`,
    `reaction: ${event.reaction}`
  );
  const hotpost = await getHotpost(event.item.channel, event.item.ts);
  if (!hotpost) {
    if (event.type === 'reaction_added') {
      Log.debug('\t\tnew hotpost');
      await createHotpost({
        channel: event.item.channel,
        ts: event.item.ts,
        reactionCount: 1,
        reactions: {
          [event.reaction]: 1,
        },
        usersCount: 1,
        users: [event.user],

        isEarly: false,
        isHot: false,
        updatedAt: replaceTsToNumber(event.event_ts),
      });
    } else if (event.type === 'reaction_removed') {
      Log.warn('  \treaction_removed but not found');
      // TODO: fetch from API
    }
    return;
  }

  // Revaluate
  if (event.type === 'reaction_added') {
    hotpost.reactions[event.reaction] =
      hotpost.reactions[event.reaction] + 1 || 1;
    hotpost.reactionCount = Object.entries(hotpost.reactions).reduce(
      (acc, [_, value]) => {
        acc += value;
        return acc;
      },
      0
    );
    hotpost.users = Array.from(new Set([...hotpost.users, event.user]));
    hotpost.usersCount = hotpost.users.length;
  } else if (event.type === 'reaction_removed') {
    hotpost.reactions[event.reaction] =
      hotpost.reactions[event.reaction] - 1 || 0;
    if (hotpost.reactions[event.reaction] === 0) {
      delete hotpost.reactions[event.reaction];
    }
    hotpost.reactionCount = Object.entries(hotpost.reactions).reduce(
      (acc, [_, value]) => {
        acc += value;
        return acc;
      },
      0
    );
    if (hotpost.reactionCount === 0) {
      Log.debug("  \tNo reaction, so reset users' info");
      hotpost.users = [];
      hotpost.usersCount = 0;
    } else {
      // NOTE: This is not a correct calculation, but we'll remove user because we cannot investigate it.
      hotpost.users = hotpost.users.filter((u) => u !== event.user);
      hotpost.usersCount = hotpost.users.length;
    }
  }
  // Determine if notification is necessary
  if (hotpost.isHot) {
    Log.debug('  \tAlready Hot, so do nothing');
  } else {
    if (isHotpost(hotpost)) {
      hotpost.isHot = true;
      await postMessage(client, hotpost, 'hot');
    } else if (hotpost.isEarly) {
      Log.debug('  \tNot applicable to Hot and already Early, so do nothing');
    } else if (isEarlypost(hotpost)) {
      hotpost.isEarly = true;
      await postMessage(client, hotpost, 'early');
    }
  }
  // Save
  await updateHotpost(hotpost, replaceTsToNumber(event.event_ts));
};

const postMessage = async (client, hotpost: Hotpost, type: 'hot' | 'early') => {
  const option = getBotOption();
  const isHot = type === 'hot';
  Log.success(
    `⚡️ Detect ${isHot ? 'Hot' : 'Early'} Post ${option.isDev ? '(dev)' : ''}`
  );
  if (option.dryRun) {
    Log.success('  \t[Dry Run]', hotpost);
    return;
  }
  const channel = isHot
    ? option.hotpostOption.hotChannel
    : option.hotpostOption.earlyChannel;
  if (!channel) {
    Log.warn(`⚠ ${isHot ? 'hotChannel' : 'earlyChannel'} is not set`);
    return;
  }
  const url = await buildUrl(client, hotpost);
  await client.chat.postMessage({
    channel,
    mrkdwn: true,
    unfurl_links: true,
    text: `<${url}|This post> in <#${hotpost.channel}> ${
      isHot ? 'is HOT' : 'might be HOT'
    } right now!`,
  });
  await client.chat.postMessage({
    channel,
    mrkdwn: true,
    unfurl_links: true,
    text: ' ',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${url}|${Object.entries(hotpost.reactions)
            .sort((a, b) => b[1] - a[1])
            .map((kv, _) => `:${kv[0]}: ×${kv[1]}`)
            .join(' ')}>`,
        },
      },
      {
        type: 'divider',
      },
    ],
  });
};
