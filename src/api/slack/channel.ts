import { SlackDemoOptions } from '../../types';
import { getChannelsList } from './conversations';
import {
  ConversationsInviteArguments,
  ConversationsInviteResponse,
  ConversationsJoinArguments,
  ConversationsJoinResponse,
  ConversationsListArguments,
} from '@slack/web-api';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import * as Log from '../../lib/log';
import { botClient, userClient } from '.';

export const getAllChannels = async (
  args: ConversationsListArguments,
  options?: SlackDemoOptions
): Promise<Channel[]> => {
  const channels = Array<Channel>();
  let cursor: string | undefined;
  do {
    const res = await getChannelsList({ ...args, cursor }, options);
    cursor = res.response_metadata?.next_cursor;
    channels.push(...(res.channels || []));
  } while (cursor);

  return channels;
};

export const joinChannel = async (
  args: ConversationsJoinArguments,
  options?: SlackDemoOptions
): Promise<ConversationsJoinResponse | undefined> => {
  if (options?.dryRun) {
    Log.success(`dry-run: joinChannel({ channel: ${args.channel} })`);
    return;
  }
  if (options?.asBot) return botClient.conversations.join(args);
  return userClient.conversations.join(args);
};

export const inviteToChannel = async (
  args: ConversationsInviteArguments,
  options?: SlackDemoOptions
): Promise<ConversationsInviteResponse | undefined> => {
  if (options?.dryRun) {
    Log.success(
      `dry-run: inviteToChannel({ channel: ${args.channel}, users: ${args.users} })`
    );
    return;
  }
  Log.success(
    `${options?.asBot} inviteToChannel({ channel: ${args.channel}, users: ${args.users} })`
  );
  // if (options?.asBot) return botClient.conversations.invite(args);
  return userClient.conversations.invite(args);
};
