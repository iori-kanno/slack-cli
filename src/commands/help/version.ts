import { getCurrentCliVersion } from '@/lib/helper';
import { Log } from '@/lib/log';
import { CliExecFn } from '@/types';

export const exec: CliExecFn = () => {
  const version = getCurrentCliVersion();
  if (!version) {
    Log.error('バージョンを取得できませんでした');
    return { error: 'バージョンを取得できませんでした' };
  }
  return { text: version };
};
