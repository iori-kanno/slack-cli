import { Log } from '@/lib/log';
import { deleteHotpostList, getHotpostList } from '../storage/sqlite';
import { Hotpost } from './types';

const THREASHOLD_MILL_SEC = 24 * 60 * 60 * 1000;

const needsToDelete = (hotpost: Hotpost, ts: number) => {
  const result =
    !hotpost.isHot &&
    !hotpost.isEarly &&
    ts - hotpost.updatedAt > THREASHOLD_MILL_SEC;
  Log.debug(
    '\t\tneedsToDelete',
    !hotpost.isEarly,
    !hotpost.isHot,
    ts - hotpost.updatedAt > THREASHOLD_MILL_SEC,
    `result = ${result}`
  );
  return result;
};

export const scheduledTask = async () => {
  Log.debug('⚡️ scheduledTask');
  const currentTs = Date.now();
  let offset = 0;
  while (true) {
    const hotposts = await getHotpostList(offset, 100);
    Log.debug("\t\thotposts' count: ", hotposts.length, 'offset: ', offset);
    if (hotposts.length === 0) break;
    offset += hotposts.length;
    await deleteHotpostList(
      hotposts.filter((h) => needsToDelete(h, currentTs))
    );
  }
};
