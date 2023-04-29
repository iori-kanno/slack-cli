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
export const parseReactions = (reactions?: string): ReturnValue => {
  if (!reactions) {
    const defaultReactions = ['+1', 'pray'];
    return {
      targetReactions: defaultReactions,
      singleReactions: defaultReactions,
      categorizedReactions: [],
    };
  }
  const targetReactions = reactions.replace(/\[|\]/g, '').split(',');
  const singleReactions = reactions
    .replace(regex, '')
    .split(',')
    .filter((s) => s);
  const categorizedReactions =
    reactions
      .match(regex)
      ?.map((r) => r.replace(/\[|\]/g, '').split(','))
      .filter((c) => c.length > 1) ?? [];
  return { targetReactions, singleReactions, categorizedReactions };
};
