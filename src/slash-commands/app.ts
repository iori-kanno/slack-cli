import { App } from '@slack/bolt';
import { ConsoleLogger } from '@slack/logger';

const logger = new ConsoleLogger();
// Log で使用する Logger として設定すると混ざって見づらいのでセットしない方がいいかも
// Log.setLogger(logger);

export const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  logger,
});
export const port = process.env.PORT || 3300;
