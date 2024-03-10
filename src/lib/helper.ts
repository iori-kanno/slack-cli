import pkg from '@/../package.json';
import dayjs from 'dayjs';
import { SlackDemoOptions } from '@/types';
import { getAllUsers } from '@/api/slack/users';
import { getAllUsergroups } from '@/api/slack/usergroups';

export function getCurrentCliVersion() {
  return pkg.version;
}

export async function getPublishedCliVersion() {
  return getCurrentCliVersion();
  // TODO: バージョン
  // const response = await fetch(`https://registry.npmjs.org/hoge/latest`);
  // const data: { version: string } = await response.json();
  // const latest = data['version'];
  // return latest;
}

export const replaceTsToNumber = (ts: string): number => {
  // 1670135159.609009 => 1670135159609 に変換する
  return parseInt(ts.slice(0, 14).replace('.', ''));
};

export const convertTsToDate = (ts: string): Date => {
  // unixtime から date へ変換する
  return new Date(replaceTsToNumber(ts));
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

export const replaceMemberIdToNameInTexts = async (
  texts: string[],
  options?: SlackDemoOptions
) => {
  // 全員の名前が欲しいので全員分のユーザー情報を取得する
  const members = (await getAllUsers({}, options))
    .filter((m) => m.id && m.name)
    .map((m) => ({ regexp: new RegExp(m.id!, 'g'), name: m.name! }));

  const usergroups = (await getAllUsergroups({}, options))
    .filter((u) => u.id && u.name)
    .map((u) => ({ regexp: new RegExp(u.id!, 'g'), name: u.name! }));

  return texts.map((t) => {
    let text = t;
    for (const member of members) {
      text = text.replace(member.regexp, member.name);
    }
    for (const usergroup of usergroups) {
      text = text.replace(usergroup.regexp, usergroup.name);
    }
    return text;
  });
};
