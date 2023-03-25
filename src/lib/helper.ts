// import pkg from '../../package.json';
import dayjs from 'dayjs';

export function getCurrentCliVersion() {
  return '0.1.0';
  // TODO: load pkg
  // return pkg.version;
}

export async function getPublishedCliVersion() {
  return getCurrentCliVersion();
  // TODO: バージョン
  // const response = await fetch(`https://registry.npmjs.org/hoge/latest`);
  // const data: { version: string } = await response.json();
  // const latest = data['version'];
  // return latest;
}

export const convertTsToDate = (ts: string): Date => {
  // unixtime から date へ変換する
  // 1670135159.609009 => 1670135159609 に変換して new Date する
  return new Date(parseInt(ts.slice(0, 14).replace('.', '')));
};

export const isWithinByRawString = (
  ts: string,
  start?: string,
  end?: string
): boolean => {
  return isWithinByDate(
    convertTsToDate(ts),
    start ? convertTsToDate(start) : undefined,
    end ? convertTsToDate(end) : undefined
  );
};

export const isWithinByDate = (
  target: Date,
  start?: Date,
  end?: Date
): boolean => {
  const startDate = start ?? new Date(1970, 0, 0);
  const endDate = end ?? new Date(2100, 0, 0);
  return dayjs(endDate).diff(target) >= 0 && dayjs(startDate).diff(target) <= 0;
};
