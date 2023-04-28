import { App, SlashCommand } from '@slack/bolt';

export const handleMonitoring = (app: App, channelId?: string) => {
  return async (command: SlashCommand, extraMessage?: string) => {
    if (!channelId) return;
    return app.client.chat.postMessage({
      channel: channelId,
      mrkdwn: true,
      text: `${command.user_name} commanded \`${command.command} ${
        command.text
      }\` ${extraMessage ? `${extraMessage}` : ''}`,
    });
  };
};
