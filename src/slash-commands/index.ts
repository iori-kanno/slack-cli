import { Log } from '@/lib/log';
import arg from 'arg';
import * as cron from 'node-cron';
import { exec } from '../commands';
import { buildApp, setBotOption } from './app';
import { handleReactionAdded, handleReactionRemoved } from './handler';
import { scheduledTask } from './hotpost/scheduled';
import { handleMonitoring } from './monitoring';
import {
  dumpMemoryUsage,
  makeChannelsCache,
  makeUsersCache,
} from './storage/memory';
import { handleRespond } from './util';

/* Add functionality here */

(async () => {
  const args = arg(
    {
      '--permitted-users': String,
      '--monitoring-channel-id': String,
      '--socket-mode-disable': Boolean,
      '--port': Number,
      '--debug': Boolean,
      '--dev': Boolean,
      '--hot-channel': String,
      '--early-channel': String,
    },
    {
      permissive: true,
    }
  );

  const isDebug = !!args['--debug'];
  Log.setDebug(isDebug);
  const botOption = {
    isDev: !!args['--dev'],
    dryRun: false, // not supported yet
    hotpostOption: {
      hotChannel: args['--hot-channel'] || process.env.SLACK_HOT_CHANNEL,
      earlyChannel: args['--early-channel'] || process.env.SLACK_EARLY_CHANNEL,
    },
  };
  setBotOption(botOption);

  // Initialize your app
  const isSocketMode = !(args['--socket-mode-disable'] === true);
  const app = buildApp({ socketMode: isSocketMode });
  const monitoring = handleMonitoring(app, args['--monitoring-channel-id']);
  const permittedUsers = args['--permitted-users']?.split(',');
  Log.debug(`permittedUsers: ${permittedUsers ? permittedUsers : 'all users'}`);

  // Start the app
  if (isSocketMode) {
    await app.start();
    Log.success(`⚡️ Bolt app is running!`);
  } else {
    const port = args['--port'] || 3000;
    await app.start(port);
    Log.success(`⚡️ Bolt app is running on ${port} port!`);
  }

  // TODO: move to handler.ts
  app.command('/slack-cli', async ({ command, ack, respond }) => {
    try {
      Log.debug('⚡️ command', command);
      if (command.text === 'ping') {
        await ack('pong');
        return;
      }

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
      const resumeLogText = `${command.trigger_id.split('.')[0]}: ${
        command.user_name
      }'s command accepted.\n \`${command.command} ${command.text}\`.`;
      const { ts } = await customRespond({
        text: resumeLogText + '\nstart...',
      });
      let respondCount = 1;
      try {
        const res = await exec(execCommandName, execCommandArgs, {
          canNotifyUpdate: false,
          progress: async (p) => {
            Log.debug(`${command.trigger_id}: ${p.message}`);
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
            text: `${resumeLogText}\n*Error*: ${res.error}`,
          });
          return;
        }
        if (res?.postArg) {
          const args = res.postArg;
          await customRespond({
            text: `${resumeLogText}\n${
              res.asUser ? '`--as-user` not in service\n' : ''
            }${res.text ?? ''}`,
            ...args,
          });
        } else if (res?.text) {
          await customRespond({
            text: `${resumeLogText}\n${res.text}`,
          });
        }
      } catch (e) {
        Log.error(e);
        await Promise.all([
          app.client.chat.postMessage({
            channel: command.channel_id,
            thread_ts: ts,
            reply_broadcast: ts !== undefined,
            text: `エラー発生により処理が中断されました。${e}`,
          }),
          monitoring(command, `エラー発生により処理が中断されました。${e}`),
        ]);
      }
    } catch (e) {
      Log.error(e);
      await monitoring(command, `エラーが発生しました。${e}`);
    }
  });

  // Process reaction events
  if (
    botOption.hotpostOption.hotChannel &&
    botOption.hotpostOption.earlyChannel
  ) {
    Log.debug('handleReactionEvent is started');
    app.event('reaction_added', handleReactionAdded);
    app.event('reaction_removed', handleReactionRemoved);
  } else {
    Log.warn(
      'handleReactionEvent is not started because hotChannel or earlyChannel is not set.'
    );
  }

  // Run every day at 3:00 AM
  cron.schedule(
    '* 3 * * *',
    async () => {
      Log.success('⏲ cron.schedule start for wipe-hotposts');
      await scheduledTask();
      Log.success('⏲ cron.schedule done');
    },
    {
      scheduled: true,
      timezone: 'Asia/Tokyo',
      name: 'wipe-hotposts',
      runOnInit: false,
    }
  );
  // Run every 2 hours
  cron.schedule(
    '20 */2 * * *',
    async () => {
      Log.success('⏲ cron.schedule start for update-caches');
      await Promise.all([
        makeUsersCache(app.client),
        makeChannelsCache(app.client),
      ]);
      dumpMemoryUsage();
      Log.success('⏲ cron.schedule done');
    },
    {
      scheduled: true,
      timezone: 'Asia/Tokyo',
      name: 'update-caches',
      runOnInit: true,
    }
  );
})();
