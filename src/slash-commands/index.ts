import { exec } from '../commands';
import arg from 'arg';
import * as Log from '../lib/log';
import { app } from './app';
import { handleRespond } from './util';
import { handleMonitoring } from './monitoring';

/* Add functionality here */

(async () => {
  const args = arg(
    {
      '--permitted-users': String,
      '--monitoring-channel-id': String,
      '--port': Number,
      '--debug': Boolean,
    },
    {
      permissive: true,
    }
  );

  const port = args['--port'] || 3000;
  const isDebug = !!args['--debug'];
  Log.setDebug(isDebug);
  const monitoring = handleMonitoring(app, args['--monitoring-channel-id']);
  const permittedUsers = args['--permitted-users']?.split(',');
  Log.debug(`permittedUsers: ${permittedUsers ? permittedUsers : 'all users'}`);

  // Start the app
  await app.start(port);

  Log.success(
    `⚡️ Bolt app is running on ${port}${isDebug ? ' with DEBUG MODE!' : '!'}`
  );

  app.command('/slack-cli', async ({ command, ack, respond }) => {
    try {
      Log.debug('⚡️ command', command);

      if (
        permittedUsers &&
        !permittedUsers.some((u) => u === command.user_id)
      ) {
        await ack(
          'slack-cli の実行権限が付与されていません。管理者にお問い合わせください。'
        );
        await monitoring(command, 'but, not permitted.');
        return;
      }
      // Acknowledge command request
      await ack();
      monitoring(command);

      const args = arg(
        {},
        {
          permissive: true,
          argv: command.text.split(' '),
        }
      );
      // NOTE: aggregate コマンドは respond の 30分以内という制約に引っかかる可能性が高いので respond を使用しない
      const isPublic =
        !args._.includes('--private') ?? command.text.indexOf('aggregate') > 0;
      const execCommandName = args._[0] || '--version';
      const execCommandArgs = args._.slice(1).filter((a) => a !== '--private');
      const customRespond = handleRespond(
        respond,
        command.channel_id,
        isPublic
      );
      const resumeLogText = `${command.user_name} commanded \`${command.command} ${command.text}\`.`;
      const { ts } = await customRespond({
        text: resumeLogText + '\nstart...',
      });
      let respondCount = 1;
      const res = await exec(execCommandName, execCommandArgs, {
        canNotifyUpdate: false,
        progress: async (p) => {
          Log.debug(p.message);
          // NOTE: respond は 5 回までの制約があるので、progress での更新は 4 回までにする
          if (!isPublic && ++respondCount > 4) return;
          await customRespond(
            {
              text:
                resumeLogText +
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
          text: `${resumeLogText}\n${res.text}`,
        });
      } else if (res?.postArg) {
        const args = res.postArg;
        await customRespond({
          text: `${resumeLogText}\n${
            res.asUser ? '`--as-user` not in service\n' : ''
          }${res.text ?? ''}`,
          ...args,
        });
      }
    } catch (e) {
      Log.error(e);
      await monitoring(command, `エラーが発生しました。${e}`);
    }
  });
})();
