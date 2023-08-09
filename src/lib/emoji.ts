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
