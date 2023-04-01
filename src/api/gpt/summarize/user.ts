import { chatWithGpt } from '..';
import { adjustTalks } from '../util';
import * as Log from '../../../lib/log';

const makePrompt = (talk: string, length: number) => `
以下はSlackのとある人物の投稿内容です。
どのような人物か、${length}文字程度で考察してください。

以下がSlackの投稿内容です。
${talk}

「この人物は」といった主語を省略した考察:
`;

const SUMMARY_LENGTH = 50 as const;

export const summarizeUser = async (
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
    return summarizeUser(
      responses.flatMap((t) => t.split('\n')),
      true
    );
  }
  return responses.join('\n');
};
