import { ChatPostMessageArguments } from '@slack/web-api';
import { app } from './app';
import { RespondFn, SlackAction } from '@slack/bolt';
import * as Log from '../lib/log';
import { appendFileAsCsv } from '../lib/appendFile';

const customRespond = async (
  arg: ChatPostMessageArguments,
  tsToUdate?: string
) => {
  if (tsToUdate) {
    return app.client.chat.update({
      ...arg,
      ts: tsToUdate,
    });
  } else {
    return app.client.chat.postMessage(arg);
  }
};

export const handleRespond = (
  respond: RespondFn,
  channel: string,
  isPublic: boolean
) => {
  return async (
    arg: Omit<ChatPostMessageArguments, 'channel' | 'ts'>,
    tsToUdate?: string
  ) => {
    if (isPublic) {
      return customRespond({ ...arg, channel }, tsToUdate);
    } else {
      return respond({
        response_type: 'ephemeral',
        ...arg,
      })
        .then((res) => {
          Log.debug(res);
          return { ts: undefined };
        })
        .catch((e) => {
          Log.error(`handleRespond.respond Error: ${e}`);
          return { ts: undefined };
        });
    }
  };
};

export const loggingPulseCheck = async (action: SlackAction, value: number) => {
  let name = '';
  if ('name' in action.user) {
    name = action.user.name;
  } else if ('username' in action.user) {
    name = action.user.username;
  }
  return await appendFileAsCsv('../logs/pulse-check.log', [
    action.user.id,
    name,
    `${value}`,
    new Date().toISOString(),
  ]);
};

export const trimChannelArg = (text: string) => {
  return text.replace(/<#.*\|(.*)>/, '$1');
};
