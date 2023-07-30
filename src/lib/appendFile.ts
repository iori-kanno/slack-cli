import fs from 'fs';
import util from 'util';

export const appendFile = async (path: string, content: string) => {
  const writeFile = util.promisify(fs.writeFile);
  const appendFile = util.promisify(fs.appendFile);
  return appendFile(path, content)
    .catch((e) => {
      console.warn(`appendFile Error: ${e}`);
      return writeFile(path, content);
    })
    .catch((e) => {
      console.error(`writeFile Error: ${e}`);
    });
};

export const appendFileAsCsv = async (path: string, content: string[]) =>
  appendFile(path, content.join(',') + '\n');
