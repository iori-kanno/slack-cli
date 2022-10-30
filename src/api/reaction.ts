import { Reaction } from '@slack/web-api/dist/response/ReactionsGetResponse';
import { mapUserIdsToMembers } from './user';
import * as Log from '../lib/log';
import { invalidOptionText } from '../lib/messages';
import { getReactions } from './slack/reactions';
import { SlackDemoOptions } from '../types';
import { postMessageToSlack } from './slack/chat';

const getReactionsOnPost = async (
  channel?: string,
  ts?: string,
  options?: SlackDemoOptions
): Promise<Reaction[] | undefined> => {
  if (!(channel && ts)) {
    Log.error(invalidOptionText);
    return undefined;
  }

  try {
    const res = await getReactions(
      {
        channel,
        timestamp: ts,
      },
      options
    );
    console.log(res.message?.reactions);
    return res.message?.reactions;
  } catch (e) {
    console.error(e);
  }
};

export const aggregateReactions = async (
  channel?: string,
  ts?: string,
  options?: SlackDemoOptions
) => {
  const reactions = await getReactionsOnPost(channel, ts);
  if (!(reactions && channel)) {
    Log.error('reactions not found');
    return;
  }
  try {
    const members = await mapUserIdsToMembers(
      reactions?.flatMap((r) => r.users || []) || []
    );

    const uniqUserNames = members.map((m) => m.name).join(', ');
    const text =
      `${reactions
        ?.map(
          (r) =>
            `:${r.name}: 【 ${(r.users || [])
              .map(
                (uid) =>
                  members.find((m) => m.id === uid)?.profile
                    ?.display_name_normalized
              )
              .join(', ')} 】(${r.users?.length ?? 0})`
        )
        .join('\n')}` +
      `\n\nリアクションした人: 【 ${uniqUserNames} 】(${members.length})`;

    if (options?.dryRun) {
      Log.success('\n' + text);
      return;
    }
    const res = await postMessageToSlack(
      {
        channel,
        text,
        thread_ts: ts,
      },
      options
    );
    if (res.ok) Log.success('');
    else Log.error(res.error || '');
  } catch (e) {
    console.error(e);
  }
};
