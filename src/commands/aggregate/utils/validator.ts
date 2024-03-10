import { getAllEmoji } from '@/api/slack/emoji';
import { mapSystemEmoji } from '@/lib/emoji';
import { Log } from '@/lib/log';

export const validateReactions = async (
  reactions: string[]
): Promise<boolean> => {
  const invalidReactions = new Set<string>(reactions);
  const emoji = await getAllEmoji({});
  for (const reaction of reactions) {
    if (reaction in emoji) {
      invalidReactions.delete(reaction);
    }
  }
  const replacedReactions = mapSystemEmoji(
    Array.from(invalidReactions.values())
  );
  for (const reaction of invalidReactions.values()) {
    // 置換済みなら一致しないはず
    if (!replacedReactions.includes(reaction)) {
      invalidReactions.delete(reaction);
      continue;
    }
    Log.warn(`Invalid reaction: ${reaction}`);
  }

  return invalidReactions.size === 0;
};
