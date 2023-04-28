import arg from 'arg';
import { SlackDemoOptions } from '../types';
import * as Log from './log';

export const parseOptions = (args: arg.Result<any>) => {
  Log.setDebug(args['--debug']);
  return {
    asBot: args['--as-user'] === undefined ? true : !args['--as-user'],
    dryRun: args['--dry-run'],
    noMention: args['--no-mention'],
    startDate: args['--start-date']
      ? new Date(args['--start-date'])
      : undefined,
    endDate: args['--end-date'] ? new Date(args['--end-date']) : undefined,
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
