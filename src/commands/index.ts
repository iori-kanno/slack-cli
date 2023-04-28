import { notifyNeedUpdateCLI } from '../lib/notify-update';
import { Commands, ExecOptions } from '../types';
import { help, version } from './help';
import * as listUpReactions from './listup-reactions';
import {
  getReactionsForUser,
  getLatestPosts,
  getMembers,
  getChannels,
} from './get';
import { deleteMessage } from './delete';
import { aggregateReactions, aggregateMembersReacted } from './aggregate';
import * as joinAllPublicChannels from './join-all-public-channels';
import { summarizeChannel, summarizeMember } from './summarize';
import * as Log from '../lib/log';
import { commandListText } from '../lib/messages';

export async function exec(
  execCommandName: string,
  execCommandArgs: string[],
  options: ExecOptions = { canNotifyUpdate: false }
) {
  const commands: Commands = {
    'aggregate:members-reacted': async (a, b) =>
      aggregateMembersReacted.exec(a, b),
    'aggregate:reactions': async (a, b) => aggregateReactions.exec(a, b),
    'delete:message': async (a) => deleteMessage.exec(a),
    'get:channels': async (a) => getChannels.exec(a),
    'get:members': async (a) => getMembers.exec(a),
    'get:posts': async (a) => getLatestPosts.exec(a),
    'get:reactions': async (a) => getReactionsForUser.exec(a),
    'join:public-channels': async (a) => joinAllPublicChannels.exec(a),
    'listup:reactions': async (a) => listUpReactions.exec(a),
    'summarize:channel': async (a, b) => summarizeChannel.exec(a, b),
    'summarize:member': async (a, b) => summarizeMember.exec(a, b),
    '--help': async (a) => help.exec(a),
    '-h': async (a) => help.exec(a),
    '--version': async (a) => version.exec(a),
    '-v': async (a) => version.exec(a),
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

  return commands[execCommandName](execCommandArgs, options.progress);
}
