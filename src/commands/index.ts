import { notifyNeedUpdateCLI } from '../lib/notify-update';
import { CliExecFn } from '../types';
import * as version from './version';
import * as help from './help';
import * as listUpReactions from './listup-reactions';
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
    console.log(commandListText);
    return;
  }

  commands[execCommandName](execCommandArgs);
}
