import { exec } from '../commands';
import arg from 'arg';
import * as Log from '../lib/log';
import { app, port } from './app';
import { handleRespond } from './util';

/* Add functionality here */

(async () => {
  // Start the app
  await app.start(port);

  const isDebug = process.env.DEBUG === 'true';
  Log.setDebug(isDebug);
  Log.success(
    `⚡️ Bolt app is running on ${port}${isDebug ? ' with DEBUG MODE!' : '!'}`
  );

  app.command('/slack-cli', async ({ command, ack, respond }) => {
    // Acknowledge command request
    await ack();

    Log.debug('⚡️ command', command);
    const args = arg(
      {},
      {
        permissive: true,
        argv: command.text.split(' '),
      }
    );
    const isPublic =
      !args._.includes('--private') ?? command.text.indexOf('aggregate') > 0;
    const execCommandName = args._[0] || '--version';
    const execCommandArgs = args._.slice(1).filter((a) => a !== '--private');
    const customRespond = handleRespond(respond, command.channel_id, isPublic);
    const { ts } = await customRespond({
      text:
        `${command.user_name} commanded "slack-cli ${command.text}"` +
        '\nstart...',
    });
    let respondCount = 1;
    const res = await exec(execCommandName, execCommandArgs, {
      canNotifyUpdate: false,
      progress: async (p) => {
        Log.debug(p.message);
        if (!isPublic && ++respondCount > 4) return;
        await customRespond(
          {
            text:
              `${command.user_name} commanded "slack-cli ${command.text}"` +
              `\nprogressing (${Math.trunc(p.percent)}%): ${p.message}`,
          },
          ts
        );
      },
    });
    Log.debug(res);
    setTimeout(async () => {
      if (!ts) return;
      await app.client.chat.delete({
        ts,
        channel: command.channel_id,
      });
    }, 10000);

    if (res?.error) {
      await customRespond({
        text: `Error: ${res.error}`,
      });
      return;
    }
    if (res?.text) {
      await customRespond({
        text: `You said ${command.text}\n${res.text}`,
      });
    } else if (res?.postArg) {
      const args = res.postArg;
      await customRespond({
        text: `You said ${command.text}.\n${
          res.asUser ? '--as-user not in service\n' : ''
        }${res.text ?? ''}`,
        ...args,
      });
    }
  });
})();
