// This file is called from npm bin script. See package.json for details

import arg from 'arg';
import { exec } from './commands';
import { postMessageToSlack } from './api/slack/chat';
import * as Log from './lib/log';

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
    await postMessageToSlack(res.postArg, { asBot: !res.asUser });
  }
})();
