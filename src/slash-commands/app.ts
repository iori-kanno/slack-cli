import { Log } from '@/lib/log';
import { BotOption } from '@/types';
import { App } from '@slack/bolt';
import { ConsoleLogger } from '@slack/logger';

const logger = new ConsoleLogger();
// Log で使用する Logger として設定すると混ざって見づらいのでセットしない方がいいかも
// Log.setLogger(logger);

let app: App;
let option = {} as BotOption;

export const getApp = () => {
  if (!app) {
    throw new Error('App is not initialized. Call buildApp() first.');
  }
  return app;
};

type Args = {
  socketMode: boolean;
};

export const buildApp = ({ socketMode = false }: Args) => {
  if (socketMode && !process.env.SLACK_APP_TOKEN) {
    throw new Error('Please set SLACK_APP_TOKEN when socketMode is true.');
  }
  app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
    // NOTE: ソケットモードを有効にする場合 socketMode と appToken が必要
    socketMode,
    appToken: socketMode ? process.env.SLACK_APP_TOKEN : undefined,
    logger,
  });
  return app;
};

export const setBotOption = (newOption: Partial<BotOption>) => {
  option = { ...option, ...newOption };
  Log.debug('setBotOption', option);
};

export const getBotOption = (): Readonly<BotOption> => option;
