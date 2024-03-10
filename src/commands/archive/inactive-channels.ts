import arg from 'arg';
import { invalidOptionText } from '@/lib/messages';
import { CliExecFn } from '@/types';
import { Log } from '@/lib/log';
import { parseOptions } from '@/lib/parser';
import { getAllChannels } from '@/api/slack/channel';
import { getAllConversations } from '@/api/slack/conversations';
import {
  convertDateToSimpleDate,
  convertDateToTs,
  convertTsToSimpleDate,
} from '@/lib/date';
import { archiveChannel } from '@/api/webhook/archive';
import { convertTsToDate, isWithinByDate } from '@/lib/helper';
import { Channel } from '@slack/web-api/dist/response/AdminUsergroupsListChannelsResponse';
import { retrieveInfoForArgs } from '@/lib/arguments';

const helpText = `
\`\`\`
Command:
  archive:inactive-channels   指定された期間以上更新のないパブリックチャンネルをアーカイブする

Usage:
  slack-cli archive:inactive-channels --days 100 [options]

Required:
  --days              指定された日数以上更新のないチャンネルをアーカイブする

Options:
  --channel-id        投稿先チャンネルID。結果を投稿したい場合に指定する。
  --channel-name      投稿先チャンネル名。結果を投稿したい場合に指定する。
  --excludes          除外する文字列。カンマ区切りで複数指定可能。その場合の条件は OR
  --excludes-prefix   除外するチャンネル名接頭辞。カンマ区切りで複数指定可能
  --excludes-suffix   除外するチャンネル名接尾辞。カンマ区切りで複数指定可能
  --help, -h          このヘルプを表示
  --debug             デバッグモードで実行
  --dry-run           実際に削除せずにログ出力する
\`\`\`
`;

function parseArgs(argv?: string[]) {
  try {
    return arg(
      {
        // Types
        '--days': Number,
        '--channel-id': String,
        '--channel-name': String,
        '--excludes': String,
        '--excludes-prefix': String,
        '--excludes-suffix': String,
        '--help': Boolean,
        '--debug': Boolean,
        '--dry-run': Boolean,

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
    Log.error(helpText);
    return null;
  }
}

export const exec: CliExecFn = async (argv, progress) => {
  const error = { error: invalidOptionText + '\n' + helpText };
  if (!argv || argv.length === 0) return error;
  const args = parseArgs(argv);
  if (args === null) return error;

  if (args['--help']) {
    return { text: helpText };
  }
  if (!args['--days']) {
    Log.error('days is required');
    return error;
  }

  const options = parseOptions(args);
  const days = args['--days'];
  const limit = 30;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);
  const excludes = args['--excludes']?.split(',') || [];
  const excludesPrefix = args['--excludes-prefix']?.split(',') || [];
  const excludesSuffix = args['--excludes-suffix']?.split(',') || [];
  const allChannels = (
    await getAllChannels({ exclude_archived: true }, options)
  ).filter(
    (c) =>
      c.is_channel &&
      !c.is_archived &&
      !c.is_private &&
      !c.is_mpim &&
      !c.is_shared &&
      !c.is_org_shared
  );
  const channels = allChannels
    .filter((c) =>
      excludes.length === 0 ? true : !excludes.some((i) => c.name?.includes(i))
    )
    .filter((c) =>
      excludesPrefix.length === 0
        ? true
        : !excludesPrefix.some((i) => c.name?.startsWith(i))
    )
    .filter((c) =>
      excludesSuffix.length === 0
        ? true
        : !excludesSuffix.some((i) => c.name?.endsWith(i))
    );
  Log.success(
    `channels' count: ${allChannels.length}, excepted: ${channels.length}`
  );
  const notJoinedChannels = allChannels.filter((c) => !c.is_member);
  if (notJoinedChannels.length > 0)
    Log.warn(
      `unparticipated channels: \n${notJoinedChannels
        .map((c) => `${c.name} (${c.id})`)
        .join('\n')}`
    );
  const targetChannels: {
    channel: Channel;
    createdAt: string;
    latestPostDate: string;
  }[] = [];
  for (let index = 0; channels.length > index; index++) {
    const channel = channels[index];
    Log.debug(`channel: ${channel.name}, ${index + 1}/${channels.length}`);
    if (!channel.is_member) continue;
    try {
      const targetMessages = (
        await getAllConversations(
          { channel: channel.id!, limit },
          1,
          (m) =>
            m.ts === undefined
              ? false
              : // スレ元が既にアーカイブ対象外ならスレッドを取得しない
                !isWithinByDate(convertTsToDate(m.ts), targetDate),
          options
        )
      ).reverse();
      const createdDate = new Date((channel.created || 0) * 1000);
      const createdAt = convertDateToSimpleDate(createdDate);
      const createdTs = convertDateToTs(createdDate);
      const latestMessage =
        targetMessages
          .filter((m) => m.ts)
          .sort((a, b) => Number(b.ts!) - Number(a.ts!))[0] || undefined;
      if (
        isWithinByDate(
          convertTsToDate(latestMessage?.ts || createdTs),
          targetDate
        )
      )
        continue;

      const latestPostDate = convertTsToSimpleDate(
        latestMessage?.ts || createdTs
      );
      targetChannels.push({ channel, createdAt, latestPostDate });
      progress?.({
        percent: ((index + 1) / channels.length) * 100,
        message: `<#${channel.id}> will be archived. created: ${createdAt}, latest post: ${latestPostDate}`,
      });

      await archiveChannel(
        {
          channelId: channel.id!,
          latestPostDate,
        },
        options
      );
    } catch (e) {
      Log.error(`something happened with ${JSON.stringify(channel)}`);
      Log.error(e);
      continue;
    }
  }

  const { channel: postChannel } = await retrieveInfoForArgs({
    channelId: args['--channel-id'],
    channelName: args['--channel-name'],
  });

  const outputText = (forPost: boolean) => {
    if (!postChannel?.id && forPost) return undefined;
    const excludeText =
      channels.length !== allChannels.length
        ? `（除外設定されている ${
            allChannels.length - channels.length
          }チャンネルを除いた）`
        : '';
    return (
      `${excludeText}${channels.length}チャンネルの内 ${days}日間更新のない ${
        targetChannels.length
      }チャンネル${
        options?.dryRun ? 'がアーカイブ対象です。' : 'をアーカイブしました。'
      }\n` +
      targetChannels
        .map(
          ({ channel, createdAt, latestPostDate }) =>
            `${
              options?.dryRun ? '[dry-run] ' : ''
            }作成日: ${createdAt}, 最終投稿日: ${latestPostDate} ${
              forPost ? `<#${channel.id}>` : `#${channel.name}`
            }`
        )
        .join('\n')
    );
  };
  const postText = outputText(true);
  return {
    text: outputText(false),
    postArg:
      postText && postChannel?.id
        ? {
            text: postText,
            channel: postChannel.id,
          }
        : undefined,
  };
};
