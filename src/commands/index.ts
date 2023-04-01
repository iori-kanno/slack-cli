import { notifyNeedUpdateCLI } from '../lib/notify-update';
import { CliExecFn } from '../types';
import { help, version } from './help';
import * as listUpReactions from './listup-reactions';
import {
  getReactionsForUser,
  getLatestPosts,
  getMembers,
  getChannels,
} from './get';
import { aggregateReactions, aggregateMembersReacted } from './aggregate';
import * as joinAllPublicChannels from './join-all-public-channels';
import { summarizeChannel, summarizeMember } from './summarize';
import * as Log from '../lib/log';
import { commandListText } from '../lib/messages';

type Commands = { [command: string]: CliExecFn };
type ExecOptions = { canNotifyUpdate: boolean };

export async function exec(
  execCommandName: string,
  execCommandArgs: string[],
  options: ExecOptions = { canNotifyUpdate: false }
) {
  const commands: Commands = {
    'listup:reactions': async () => listUpReactions.exec(),
    'get:posts': async () => getLatestPosts.exec(),
    'get:reactions': async () => getReactionsForUser.exec(),
    'get:members': async () => getMembers.exec(),
    'get:channels': async () => getChannels.exec(),
    'aggregate:reactions': async () => aggregateReactions.exec(),
    'aggregate:members-reacted': async () => aggregateMembersReacted.exec(),
    'join:public-channels': async () => joinAllPublicChannels.exec(),
    'summarize:channel': async () => summarizeChannel.exec(),
    'summarize:member': async () => summarizeMember.exec(),
    '--help': async () => help.exec(),
    '-h': async () => help.exec(),
    '--version': async () => version.exec(),
    '-v': async () => version.exec(),
  };

  if (options.canNotifyUpdate) {
    // アップデートが必要な場合はCLI上に通知メッセージを表示する
    await notifyNeedUpdateCLI().catch(() => void 0);
  }

  if (!commands[execCommandName]) {
    Log.error('該当するCLIコマンドが存在しません');
    Log.warn(commandListText);
    return;
  }

  commands[execCommandName](execCommandArgs);
}
