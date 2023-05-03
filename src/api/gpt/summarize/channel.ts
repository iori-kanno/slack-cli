import { chatWithGpt } from '..';
import { adjustTalks } from '../util';
import * as Log from '../../../lib/log';
import { ProgressCallback } from '../../../types';

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
  progress?: ProgressCallback,
  loop?: boolean
): Promise<string> => {
  const responses = Array<string>();
  const adjustedTalks = adjustTalks(talks);
  for (const [index, { talk }] of adjustedTalks.entries()) {
    const res = await chatWithGpt(
      makePrompt(talk, loop ? SUMMARY_LENGTH * 3 : SUMMARY_LENGTH)
    ).then(
      (res) => res?.data.choices.map((c) => c.text || '').join('\n') || ''
    );
    progress?.({
      percent: !loop
        ? Math.max(30, 29 + ((index + 1) / adjustedTalks.length) * 70)
        : 99,
      message: !loop
        ? `要約中... ${talk.substring(0, 30)}`
        : `要約サイズが大きかったため再度要約中... (${index + 1}/${
            adjustedTalks.length
          })`,
    });
    responses.push(res);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  Log.debug(responses);
  if (responses.length > 6) {
    return summarizeChannel(
      responses.flatMap((t) => t.split('\n')),
      progress,
      true
    );
  }
  return responses.join('\n');
};
