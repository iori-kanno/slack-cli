import { validate } from '@slack/bolt/dist/WorkflowStep';
import { validateReactions } from './validator';

type ReturnValue = {
  /** []でくくられているものを flatten した集計対象のリスト */
  targetReactions: string[];
  /** []でくくられていない集計対象のリスト */
  singleReactions: string[];
  /** []でくくられている集計対象のリスト */
  categorizedReactions: string[][];
};

const regex = /\[(.*?)\]/g;

/** ,区切りに加えて[]でひとまとめにできるような文字列をパースする
 *  "aaa,[bbb,ccc],ddd" */
export const parseReactions = async (
  reactions?: string
): Promise<ReturnValue> => {
  if (!reactions) {
    const defaultReactions = ['+1', 'pray'];
    return {
      targetReactions: defaultReactions,
      singleReactions: defaultReactions,
      categorizedReactions: [],
    };
  }
  const targetReactions = reactions
    .replace(/\[|\]/g, '')
    .split(',')
    .map((s) => s.trim());
  const singleReactions = reactions
    .replace(regex, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s);
  const categorizedReactions =
    reactions
      .match(regex)
      ?.map((r) =>
        r
          .replace(/\[|\]/g, '')
          .split(',')
          .map((s) => s.trim())
      )
      .filter((c) => c.length > 1) ?? [];

  const isValid = await validateReactions(targetReactions);
  if (!isValid) {
    throw new Error(
      'Invalid reactions. Please check the list of reactions you specified.'
    );
  }

  return { targetReactions, singleReactions, categorizedReactions };
};
