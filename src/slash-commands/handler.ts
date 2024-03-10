import * as Log from '../lib/log';
import { handleHotpost } from './hotpost';

export const handleReactionAdded = async ({ event, client, ...args }) => {
  Log.debug('⚡️ reaction_added event', event);
  return Promise.all([handleHotpost({ event, client, ...args })]).then(
    () => void 0
  );
};

export const handleReactionRemoved = async ({ event, client, ...args }) => {
  Log.debug('⚡️ reaction_removed event', event);
  return Promise.all([handleHotpost({ event, client, ...args })]).then(
    () => void 0
  );
};
