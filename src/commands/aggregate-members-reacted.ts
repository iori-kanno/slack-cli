import arg from 'arg';
import {
  invalidOptionText,
  byEachMemberReactedHelpText,
} from '../lib/messages';
import { CliExecFn, SlackDemoOptions } from '../types';
import * as Log from '../lib/log';
import { retrieveAllUser } from '../api/user';
import { getAllReactedItems } from '../api/slack/reactions';
import { aggregateReactionsForEachMember } from '../api/reaction';
import { Item } from '@slack/web-api/dist/response/ReactionsListResponse';
import { postMessageToSlack } from '../api/slack/chat';
import { getAllChannels } from '../api/slack/channel';
import { Channel } from '@slack/web-api/dist/response/ChannelsListResponse';
import groupBy from 'just-group-by';
import { aggregateUniqItemsReactedByMembers } from '../lib/aggregator';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--start-date': String,
        '--end-date': String,
        '--channel-name': String,
        '--channel-id': String,
        '--reactions': String,
        '--dry-run': Boolean,
        '--as-user': Boolean,
        '--no-mention': Boolean,
        '--help': Boolean,
        '--debug': Boolean,

        // Alias
        '-h': '--help',
      },
      { argv }
    );
  } catch (e: any) {
    if (e.code === 'ARG_UNKNOWN_OPTION') {
      Log.error(invalidOptionText);
    } else {
      Log.error(e);
    }
    Log.error(byEachMemberReactedHelpText);
    return null;
  }
}

interface MemberDictionary {
  [id: string]: number;
}

interface ReactionDictionary {
  [id: string]: MemberDictionary;
}

export const exec: CliExecFn = async (argv) => {
  const args = parseArgs(argv);
  if (args === null) return;

  if (args['--help']) {
    Log.success(byEachMemberReactedHelpText);
    return;
  }
  Log.setDebug(args['--debug']);
  const options: SlackDemoOptions = {
    asBot: args['--as-user'] === undefined ? true : !args['--as-user'],
    dryRun: args['--dry-run'],
    noMention: args['--no-mention'],
    startDate: args['--start-date']
      ? new Date(args['--start-date'])
      : undefined,
    endDate: args['--end-date'] ? new Date(args['--end-date']) : undefined,
  };
  // dry-run でないなら投稿先チャンネルは必須
  let channel: Channel | undefined;
  if (!options.dryRun) {
    channel = (await getAllChannels({ types: 'public_channel' }, options)).find(
      (c) => c.id === args['--channel-id'] || c.name === args['--channel-name']
    );
    if (!channel) {
      Log.error('投稿先チャンネルを指定してください。');
      return;
    }
  }

  const targetItems = (await aggregateUniqItemsReactedByMembers(argv)) || [];
  const targetReactions = args['--reactions']
    ? args['--reactions'].split(',')
    : ['to-be-oriented', 'feelspecial', 'simplify-x', 'simplify-x-2', 'www'];

  const users = (await retrieveAllUser()).filter(
    (u) =>
      !u.is_bot &&
      !u.deleted &&
      !u.is_restricted &&
      !u.is_ultra_restricted &&
      !u.is_workflow_bot
  );
  const memberIds = users
    .map(({ id }) => id)
    .filter((id): id is string => typeof id == 'string');
  // ここから実装
  // uniq items からユーザー毎のターゲットリアクションを集計する
  // 投稿者のIDと得られたリアクションの辞書
  const skinToneRegex = /::skin-tone-\d/;
  const reactionNameToReactedMemberDict: ReactionDictionary = {};
  for (const reaction of targetReactions) {
    reactionNameToReactedMemberDict[reaction] = {};
  }

  for (const item of targetItems) {
    // 集計対象を整形
    const reactions =
      item.message?.reactions?.map((r) => ({
        count: r.count || 0,
        name: (r.name || '').replace(skinToneRegex, ''),
        users: r.users || [],
      })) || [];
    // targetReaction を含まない投稿を弾く
    if (!reactions.some((r) => targetReactions.includes(r.name))) continue;

    for (const reaction of reactions) {
      if (!targetReactions.includes(reaction.name)) continue;
      const rDict = reactionNameToReactedMemberDict[reaction.name];
      for (const user of reaction.users) {
        // 自身の投稿へのリアクションなら集計しない
        if (item.message?.user === user) continue;
        rDict[user] = (rDict[user] ?? 0) + 1;
      }
    }
  }

  console.log(reactionNameToReactedMemberDict);
  const blocks: string[] = [];
  for (const [rid, dict] of Object.entries(
    reactionNameToReactedMemberDict
  ).sort(
    (a, b) => targetReactions.indexOf(a[0]) - targetReactions.indexOf(b[0])
  )) {
    const candidates = groupBy(Object.entries(dict), ([mid, count]) => count);
    if (Object.keys(candidates).length === 0) {
      blocks.push(`:${rid}: をリアクションした人はいませんでした。`);
      continue;
    }
    console.log(rid, candidates);
    // 獲得数が一番多い順に 5位まで、もしくは同列順位を含めて 5人以上になるようにリストアップする
    const list: { rid: string; mid: string; count: number; rank: number }[] =
      [];
    for (const [index, value] of Object.entries(candidates).reverse()) {
      if (list.length >= 5) break;
      list.push(
        ...Object.entries(value).map(([_, v]) => ({
          rid,
          mid: v[0],
          count: v[1],
          rank: list.length + 1,
        }))
      );
    }
    const text = `最も :${rid}: をリアクションしたトップ${
      list.length
    }は、この人たちです！\n${list
      .map(({ mid, count, rank }) => {
        const member = users.find((m) => m.id === mid);
        return `${rank}. ${member?.real_name ?? member?.name}${
          options.noMention ? '' : `(<@${mid}>)`
        } (${count})`;
      })
      .join('\n')}`;
    blocks.push(text);
  }

  if (args['--dry-run']) {
    Log.success(blocks);
  } else {
    Log.success(blocks);
    await postMessageToSlack(
      {
        channel: channel!.id!,
        text: '',
        blocks: [
          `${options.startDate?.toLocaleDateString() ?? '未設定'}~${
            options.endDate?.toLocaleDateString() ?? '現在'
          }の期間で最もリアクションを行った人を発表します🎉`,
          ...blocks,
        ].flatMap((b) => [
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: b,
            },
          },
        ]),
      },
      options
    );
  }
};
