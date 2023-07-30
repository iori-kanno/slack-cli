import { ChatPostMessageArguments } from '@slack/web-api';
import { getApp } from './app';
import { RespondFn, SlackAction } from '@slack/bolt';
import * as Log from '../lib/log';

const customRespond = async (
  arg: ChatPostMessageArguments,
  tsToUdate?: string
) => {
  if (tsToUdate) {
    return getApp().client.chat.update({
      ...arg,
      ts: tsToUdate,
    });
  } else {
    return getApp().client.chat.postMessage(arg);
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
