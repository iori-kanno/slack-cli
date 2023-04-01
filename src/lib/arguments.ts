import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';
import { getAllChannels } from '../api/slack/channel';
import { retrieveAllUser } from '../api/user';
import { SlackDemoOptions } from '../types';

const channel = async (
  id?: string,
  name?: string,
  options?: SlackDemoOptions
) =>
  getAllChannels({ exclude_archived: false }, options).then((channels) =>
    channels.find((c) => c.id === id || c.name === name)
  );

type InfoProps = {
  channelId?: string;
  channelName?: string;
  memberId?: string;
  memberFuzzyName?: string;
  options?: SlackDemoOptions;
};

const member = async (
  id?: string,
  fuzzyName?: string,
  options?: SlackDemoOptions
) =>
  retrieveAllUser(options).then((members) =>
    members.find(
      (m) =>
        m.id === id ||
        [m.name, m.real_name]
          .filter((n) => n)
          .join(',')
          .includes(fuzzyName?.toLocaleLowerCase() || '')
    )
  );

export const retrieveInfoForArgs = async ({
  channelId,
  channelName,
  memberId,
  memberFuzzyName,
  options,
}: InfoProps): Promise<{ channel?: Channel; member?: Member }> =>
  Promise.all([
    channelId || channelName
      ? channel(channelId, channelName, options)
      : undefined,
    memberId || memberFuzzyName
      ? member(memberId, memberFuzzyName, options)
      : undefined,
  ]).then(([channel, member]) => ({
    channel,
    member,
  }));
