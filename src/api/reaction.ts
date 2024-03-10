import { postMessageToSlack } from '@/api/slack/chat';
import { getReactions } from '@/api/slack/reactions';
import { mapUserIdsToMembers } from '@/api/user';
import { replaceEmojiKeyIfNeeded } from '@/lib/emoji';
import { Log } from '@/lib/log';
import { invalidOptionText } from '@/lib/messages';
import { SlackDemoOptions } from '@/types';
import { Reaction } from '@slack/web-api/dist/response/ReactionsGetResponse';
import { Item } from '@slack/web-api/dist/response/ReactionsListResponse';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';

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
    Log.debug(res.message?.reactions);
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

interface ReactionDictionary {
  [id: string]: number;
}

interface MemberDictionary {
  [id: string]: ReactionDictionary;
}

/**
 * 与えられた items から与えられた members の投稿に対するリアクションを集計する
 * なお、`::skin-tone-x` は削除して集計する
 * @param {Item[]} items        重複を許容した集計対象となる Item の配列
 * @param {Member[]} members    集計対象となる Member の配列
 * @returns {MemberDictionary}  投稿したユーザーに対して追加されたリアクション名と回数の辞書
 *                              例) { 'UXXXXX': { '+1': 2, 'pray': 1 ... } }
 */
export const aggregateReactionsForEachMember = (
  items: Item[],
  members: Member[]
): MemberDictionary => {
  const skinToneRegex = /::skin-tone-\d/;
  const memberIds = members
    .map(({ id }) => id)
    .filter((id): id is string => typeof id == 'string');
  // 重複排除
  const itemMap = new Map(
    items.map((item) => [
      `${item.channel}/${item.type}/${item.message?.ts}/${item.message?.thread_ts}`,
      item,
    ])
  );
  const uniqueItems = [...new Map([...itemMap].sort()).values()];

  Log.debug(
    `items(${items.length}) - uniqueItems(${uniqueItems.length}) = ${
      items.length - uniqueItems.length
    }件重複`
  );

  // 投稿者のIDと得られたリアクションの辞書
  const postedMemberIdToReactionDict: MemberDictionary = {};
  for (const id of memberIds) {
    postedMemberIdToReactionDict[id] = {};
  }

  for (const item of uniqueItems) {
    // user （投稿者のID）がないなら集計しない
    if (!item.message?.user) continue;
    switch (item.type) {
      case 'message':
        const mDict = postedMemberIdToReactionDict[item.message.user];
        // 指定されたメンバーの投稿以外は集計しない
        if (!mDict) continue;
        for (const reaction of item.message?.reactions ?? []) {
          // リアクション名が取れないなら集計しない
          if (!reaction.name) continue;
          // ::skin-tone-x は除外して集計し、絵文字名が重複している場合は集計をまとめる
          const rName = replaceEmojiKeyIfNeeded(
            reaction.name.replace(skinToneRegex, '')
          );
          mDict[rName] =
            (mDict[rName] ?? 0) +
            (reaction.users?.filter((uid) => uid !== item.message?.user)
              .length ??
              reaction.count ??
              0);
        }
        break;
      case 'file':
        Log.debug('file: ', item);
        break;
      case 'file_comment':
        Log.debug('file_comment: ', item);
        break;
      default:
        break;
    }
  }

  return postedMemberIdToReactionDict;
};
