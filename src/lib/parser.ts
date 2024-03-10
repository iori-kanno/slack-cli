import arg from 'arg';
import { SlackDemoOptions } from '@/types';
import { Log } from '@/lib/log';

export const parseOptions = (args: arg.Result<any>) => {
  Log.setDebug(args['--debug']);
  if (args['--dry-run']) Log.warn('dry-run mode enabled.');
  const endDate = args['--end-date']
    ? new Date(args['--end-date'])
    : new Date();
  let startDate = args['--start-date']
    ? new Date(args['--start-date'])
    : undefined;
  if (!startDate) {
    startDate = new Date(endDate);
    startDate?.setMonth(endDate.getMonth() - 1);
    Log.warn(
      `startDate is not specified. set startDate to ${startDate.toLocaleString()} endDate to ${endDate.toLocaleString()}`
    );
  }
  return {
    asBot: args['--as-user'] === undefined ? true : !args['--as-user'],
    dryRun: args['--dry-run'],
    noMention: args['--no-mention'],
    includeBotIds: args['--include-bot-ids'],
    startDate,
    endDate,
  } as SlackDemoOptions;
};

const reg = new RegExp(
  '^<?https://.+.slack.com/archives/([A-Z\\d]+)/p(\\d{16}).*$'
);
export const parseSlackUrl = (
  url: string
): { channel?: string; ts?: string } => {
  Log.debug('parse target', url);
  const res = reg.exec(url);
  Log.debug(res);
  if (res && res.length > 2) {
    return {
      channel: res[1],
      ts: `${res[2].slice(0, 10)}.${res[2].slice(10)}`,
    };
  }
  return {};
};
