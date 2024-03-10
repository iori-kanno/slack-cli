import { getAllChannels } from '@/api/slack/channel';
import { getAllUsergroups } from '@/api/slack/usergroups';
import { retrieveAllUser } from '@/api/user';
import { SlackDemoOptions } from '@/types';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import { Usergroup } from '@slack/web-api/dist/response/UsergroupsListResponse';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';

const channel = async (
  id?: string,
  name?: string,
  options?: SlackDemoOptions
) =>
  getAllChannels({ exclude_archived: false }, options).then((channels) =>
    channels.find((c) => c.id === id || c.name === name)
  );

const member = async (
  id?: string,
  fuzzyName?: string,
  options?: SlackDemoOptions
) =>
  retrieveAllUser(options).then((members) =>
    members.find(
      (m) =>
        m.id === id ||
        [m.name?.toLocaleLowerCase(), m.real_name]
          .filter((n) => n)
          .join(',')
          .includes(fuzzyName?.toLocaleLowerCase() || '')
    )
  );

const usergroup = async (
  id?: string,
  fuzzyName?: string,
  options?: SlackDemoOptions
) =>
  getAllUsergroups({}, options).then((usergroups) =>
    usergroups.find(
      (ug) =>
        ug.id === id ||
        (fuzzyName &&
          ug.name?.toLocaleLowerCase().includes(fuzzyName?.toLocaleLowerCase()))
    )
  );

type InfoProps = {
  channelId?: string;
  channelName?: string;
  memberId?: string;
  memberFuzzyName?: string;
  usergroupId?: string;
  usergroupFuzzyName?: string;
  options?: SlackDemoOptions;
};

export const retrieveInfoForArgs = async ({
  channelId,
  channelName,
  memberId,
  memberFuzzyName,
  usergroupId,
  usergroupFuzzyName,
  options,
}: InfoProps): Promise<{
  channel?: Channel;
  member?: Member;
  usergroup?: Usergroup;
}> =>
  Promise.all([
    channelId || channelName
      ? channel(channelId, channelName, options)
      : undefined,
    memberId || memberFuzzyName
      ? member(memberId, memberFuzzyName, options)
      : undefined,
    usergroupId || usergroupFuzzyName
      ? usergroup(usergroupId, usergroupFuzzyName, options)
      : undefined,
  ]).then(([channel, member, usergroup]) => ({
    channel,
    member,
    usergroup,
  }));
