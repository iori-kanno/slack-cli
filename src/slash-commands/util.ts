import { ChatPostMessageArguments } from '@slack/web-api';
import { app } from './app';
import { RespondFn } from '@slack/bolt';

const customRespond = async (
  arg: ChatPostMessageArguments,
  tsToUdate?: string
) => {
  if (tsToUdate) {
    return app.client.chat.update({
      ts: tsToUdate,
      ...arg,
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
      return customRespond({ channel, ...arg }, tsToUdate);
    } else {
      return respond({
        response_type: 'ephemeral',
        ...arg,
      })
        .then((res) => console.log(res))
        .then(() => ({ ts: undefined }));
    }
  };
};
