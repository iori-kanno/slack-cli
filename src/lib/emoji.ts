import * as Log from './log';

export const mapSystemEmoji = (reactions: string[]): string[] => {
  try {
    // システム組み込みの絵文字は slack api からは取れないので自前で用意している
    const emoji = require('./assets/emoji.json');
    return reactions.map((r) => emoji[r] || r);
  } catch (e) {
    Log.error(`emoji.json Error: ${e}`);
    throw new Error("emoji.json doesn't exist");
  }
};

export const checkEmojiUniqueness = () => {
  const emoji = require('./assets/emoji.json');
  const uniqValues = new Set(Object.values(emoji));
  const uniqKeys = new Set(Object.keys(emoji));
  if (Object.values(emoji).length !== uniqValues.size) {
    Log.warn('emoji.json に重複した絵文字が存在します');
    uniqValues.forEach((v) => {
      const keys = Object.entries(emoji).filter((e) => e[1] === v);
      if (keys.length > 1) {
        Log.warn(
          `${v} は ${keys.map((k) => k[0]).join(', ')} で重複しています`
        );
      }
    });
  }
  if (Object.keys(emoji).length !== uniqKeys.size) {
    Log.warn('emoji.json に重複した key が存在します');
    uniqKeys.forEach((k) => {
      const values = Object.entries(emoji).filter((e) => e[1] === k);
      if (values.length > 1) {
        Log.warn(
          `${k} は ${values.map((v) => v[0]).join(', ')} で重複しています`
        );
      }
    });
  }
};

export const replaceEmojiKeyIfNeeded = (key: string): string => {
  if (key === 'crossed_fingers')
    return 'hand_with_index_finger_and_thumb_crossed';
  if (key === 'face_with_open_eyes_and_hand_over_mouth')
    return 'face_with_hand_over_mouth';
  if (key === 'large_red_circle') return 'red_circle';
  return key;
};
