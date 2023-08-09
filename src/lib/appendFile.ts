import fs from 'fs';
import util from 'util';
import * as Log from './log';

export const appendFile = async (path: string, content: string) => {
  const writeFile = util.promisify(fs.writeFile);
  const appendFile = util.promisify(fs.appendFile);
  return appendFile(path, content)
    .catch((e) => {
      Log.warn(`appendFile Error: ${e}`);
      return writeFile(path, content);
    })
    .catch((e) => {
      Log.error(`writeFile Error: ${e}`);
    });
};

export const appendFileAsCsv = async (path: string, content: string[]) =>
  appendFile(path, content.join(',') + '\n');
