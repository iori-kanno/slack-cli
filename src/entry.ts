// This file is called from npm bin script. See package.json for details

import { postMessageToSlack } from '@/api/slack/chat';
import { Log } from '@/lib/log';
import arg from 'arg';
import { exec } from './commands';

(async () => {
  const args = arg(
    {},
    {
      permissive: true,
    }
  );
  const execCommandName = args._[0] || '--version';
  const execCommandArgs = args._.slice(1);
  // call command
  const res = await exec(execCommandName, execCommandArgs, {
    canNotifyUpdate: false,
    progress: (p) =>
      Log.debug(`progressing (${Math.trunc(p.percent)}%): ${p.message}`),
  });
  if (!res) {
    Log.success('done.');
    return;
  }
  if (res.error) Log.error(res.error);
  if (res.text) Log.success(res.text);
  if (res.postArg) {
    Log.success('post result to slack');
    await postMessageToSlack(res.postArg, { asBot: !res.asUser });
  }
})();
