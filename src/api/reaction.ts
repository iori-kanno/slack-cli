import { client } from './index';
import { Reaction } from '@slack/web-api/dist/response/ReactionsGetResponse';
import { mapUserIdsToMembers } from './user';
import * as Log from '../lib/log';
import { invalidOptionText } from '../lib/messages';

export const getReactions = async (
  channel?: string,
  ts?: string
): Promise<Reaction[] | undefined> => {
  if (!(channel && ts)) {
    Log.error(invalidOptionText);
    return undefined;
  }

  try {
    const res = await client.reactions.get({
      channel,
      timestamp: ts,
    });
    console.log(res.message?.reactions);
    return res.message?.reactions;
  } catch (e) {
    console.error(e);
  }
};

export const aggregateReactions = async (
  channel?: string,
  ts?: string,
  dry?: boolean
) => {
  const reactions = await getReactions(channel, ts);
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

    if (dry) {
      Log.success('\n' + text);
      return;
    }
    const res = await client.chat.postMessage({
      channel,
      text,
      thread_ts: ts,
    });
    if (res.ok) Log.success('');
    else Log.error(res.error || '');
  } catch (e) {
    console.error(e);
  }
};
