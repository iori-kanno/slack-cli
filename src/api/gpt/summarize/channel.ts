import { chatWithGpt } from '..';
import { adjustTalks } from '../util';
import * as Log from '../../../lib/log';

const makePrompt = (talk: string, length: number) => `
以下はSlackのとあるチャンネルの会話内容です。
どのようなトピックについて話しているか、${length}文字程度に要約してください。

以下が会話内容です。
${talk}

トピック要約:
`;

const SUMMARY_LENGTH = 50 as const;

export const summarizeChannel = async (
  talks: string[],
  loop?: boolean
): Promise<string> => {
  const responses = Array<string>();
  for (const { talk } of adjustTalks(talks)) {
    const res = await chatWithGpt(
      makePrompt(talk, loop ? SUMMARY_LENGTH * 3 : SUMMARY_LENGTH)
    ).then(
      (res) => res?.data.choices.map((c) => c.text || '').join('\n') || ''
    );
    responses.push(res);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  Log.debug(responses);
  if (responses.length > 6) {
    return summarizeChannel(
      responses.flatMap((t) => t.split('\n')),
      true
    );
  }
  return responses.join('\n');
};
