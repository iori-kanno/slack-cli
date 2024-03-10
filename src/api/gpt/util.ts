import { encode } from 'gpt-3-encoder';
import { Log } from '@/lib/log';

interface TalkToken {
  talk: string;
  token: number;
}

export const adjustTalks = (
  talks: string[],
  tokenSize: number = 1400
): TalkToken[] => {
  const adjustedTalks = Array<TalkToken>();
  let current: TalkToken = { talk: '', token: 0 };
  for (var i = 0; i < talks.length; i++) {
    const talk = talks[i] + '\n';
    const token = calcTokenSize(talk);
    if (current.token + token < tokenSize) {
      current.talk += talk;
      current.token += token;
    } else {
      // 1 つの talk が tokenSize を超えている場合は分割する。
      if (token > tokenSize) {
        Log.debug(`talk is too long: ${talk.substring(0, 20)}...`);
        adjustedTalks.push(
          ...adjustTalks(
            [talk.slice(0, talk.length / 2), talk.slice(talk.length / 2)],
            tokenSize
          )
        );
        current = { talk: '', token: 0 };
      } else {
        adjustedTalks.push(current);
        current = { talk, token };
      }
    }
  }
  if (current.token > 0) adjustedTalks.push(current);
  adjustedTalks.forEach((tt) =>
    Log.debug(`${tt.token}: ${tt.talk.substring(0, 20)}...`)
  );

  return adjustedTalks;
};

export const calcTokenSize = (text: string): number => {
  const encoded = encode(text);
  // Log.debug(`encoded: ${encoded.length} (${text.substring(0, 20)}...)`);
  return encoded.length;
};
