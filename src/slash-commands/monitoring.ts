import { App, SlashCommand } from '@slack/bolt';
import * as Log from '../lib/log';

export const handleMonitoring = (app: App, channelId?: string) => {
  return async (command: SlashCommand, extraMessage?: string) => {
    if (!channelId) return;
    return app.client.chat
      .postMessage({
        channel: channelId,
        mrkdwn: true,
        text: `${command.trigger_id.split('.')[0]}: ${
          command.user_name
        } commanded \`${command.command} ${command.text}\` ${
          extraMessage ? `${extraMessage}` : ''
        }`,
      })
      .catch((e) => Log.error(`handleMonitoring Error: ${e}`));
  };
};
