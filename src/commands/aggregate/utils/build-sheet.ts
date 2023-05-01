import { GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { getAllEmoji } from '../../../api/slack/emoji';
import { getAllUsers } from '../../../api/slack/users';
import { buildSheet } from '../../../api/spreadsheet/build-sheet';
import * as Log from '../../../lib/log';
import { SlackDemoOptions } from '../../../types';

const dateTimeString = () => {
  // NOTE: スプレッドシートにコロン `:` が使えないので時分秒を使う
  const now = new Date();
  return `${now.getFullYear()}/${
    now.getMonth() + 1
  }/${now.getDate()} ${now.getHours()}時${now.getMinutes()}分${now.getSeconds()}秒`;
};

const setSlackEmojiToHeaders = async (
  sheet: GoogleSpreadsheetWorksheet,
  reactions: string[]
) => {
  // NOTE: `=image(url)` を sheet.addRows 前に行うと、URLの画像は表示されるが、rows が追加されないため、
  //       最初にヘッダーを reaction name のまま追加して、ここで最後に置き換える
  const emoji = await getAllEmoji({});
  const headers = reactions.map((r) => {
    if (r === '01' || r === '1') console.log(r, emoji[r]);
    // slack emoji は png/gif 等画像の URL なので image 関数にする
    return emoji[r] ? `=image("${emoji[r]}")` : r;
  });
  return sheet.setHeaderRow(['user', ...headers]);
};

const updateProperties = async (
  sheet: GoogleSpreadsheetWorksheet,
  headers: string[]
) => {
  const common = {
    hiddenByUser: false,
    hiddenByFilter: false,
    developerMetadata: [],
  };
  return Promise.all([
    sheet.updateDimensionProperties(
      'ROWS',
      {
        ...common,
        pixelSize: 30,
      },
      { startIndex: 0, endIndex: 1 }
    ),
    sheet.updateDimensionProperties(
      'COLUMNS',
      {
        ...common,
        pixelSize: 200,
      },
      { startIndex: 0, endIndex: 1 }
    ),
    sheet.updateDimensionProperties(
      'COLUMNS',
      {
        ...common,
        pixelSize: 40,
      },
      { startIndex: 1, endIndex: headers.length }
    ),
  ]).then(() => void 0);
};

const mapSystemEmoji = (reactions: string[]): string[] => {
  try {
    // システム組み込みの絵文字は slack api からは取れないので自前で用意している
    const emoji = require('../../../lib/assets/emoji.json');
    return reactions.map((r) => emoji[r] || r);
  } catch (e) {
    Log.error(`emoji.json Error: ${e}`);
    throw new Error("emoji.json doesn't exist");
  }
};

const mapUsers = async (
  userIds: string[],
  options?: SlackDemoOptions
): Promise<{ id: string; name: string }[]> => {
  // NOTE: 対象者以外の名前も欲しいので新規に取得する
  const allUsers = await getAllUsers({}, options);
  return userIds.map((uid) => ({
    id: uid,
    name: allUsers.find((u) => u.id === uid)?.name || `名無し`,
  }));
};

type ReactionsArg = {
  sheetId: string;
  command: string;
  targetReactions: string[];
  dict: Map<string, Array<{ mid: string; count: number }>>;
};

export const buildSheetReactions = async (
  { sheetId, command, targetReactions, dict }: ReactionsArg,
  options?: SlackDemoOptions
) => {
  // 数が多いので1つ以上リアクションがついているものだけを対象にしつつ、
  // 数が多い順に並び替えて最後に指定したリアクションが先頭に来るようにする
  const allReactions = Array.from(dict.entries())
    .filter(([, v]) => v.some(({ count }) => count > 0))
    .sort(
      ([, va], [, vb]) =>
        vb.reduce((acc, cur) => acc + cur.count, 0) -
        va.reduce((acc, cur) => acc + cur.count, 0)
    )
    .sort(
      ([ra], [rb]) => targetReactions.indexOf(rb) - targetReactions.indexOf(ra)
    )
    .flatMap(([k]) => k);

  let replacedReactions = [...mapSystemEmoji(allReactions)];
  const headers = ['user', ...replacedReactions];

  const users = await mapUsers(
    Array.from(
      new Set(
        allReactions.flatMap((r) => dict.get(r)?.flatMap((v) => v.mid) || [])
      )
    ),
    options
  );

  const rows = [
    ...users.map((user) => {
      // ヘッダーと同じ名前のものが必要なので注意
      return {
        user: `${user.name} (${user.id})`,
        ...Object.fromEntries(
          headers
            .slice(1)
            .map((header, index) => ({ key: allReactions[index], header }))
            .map(({ key, header }) => {
              const count =
                dict.get(key)?.find((v) => v.mid === user.id)?.count || 0;
              return [header, count];
            })
        ),
      };
    }),
  ];

  try {
    return buildSheet({
      sheetId,
      title: `🎁された人 ${dateTimeString()}`,
      command,
      headers,
      rows,
      adjust: async (sheet) => {
        await setSlackEmojiToHeaders(sheet, replacedReactions);
        return updateProperties(sheet, headers);
      },
    });
  } catch (e) {
    Log.error(`buildSheetReactions Error: ${e}`);
  }
};

type MembersReactedArg = {
  sheetId: string;
  command: string;
  dict: { [reaction: string]: { [mid: string]: number } };
};

export const buildSheetMembersReacted = async (
  { sheetId, command, dict }: MembersReactedArg,
  options?: SlackDemoOptions
) => {
  // 数が多いので1つ以上リアクションがついているものだけを対象にしつつ数が多い順に並び替える
  const allReactions = Array.from(
    Object.entries(dict)
      // .filter(([, v]) => Object.values(v).some((count) => count > 0))
      .sort(
        ([, va], [, vb]) =>
          Object.values(vb).reduce((acc, cur) => acc + cur, 0) -
          Object.values(va).reduce((acc, cur) => acc + cur, 0)
      )
      .flatMap(([k]) => k)
  );

  let replacedReactions = [...mapSystemEmoji(allReactions)];
  const headers = ['user', ...replacedReactions];

  const users = await mapUsers(
    Array.from(
      new Set(
        allReactions.flatMap(
          (r) => Object.keys(dict[r]).flatMap((r) => r) || []
        )
      )
    ),
    options
  );

  const rows = [
    ...users.map((user) => {
      // ヘッダーと同じ名前のものが必要なので注意
      return {
        user: `${user.name} (${user.id})`,
        ...Object.fromEntries(
          headers
            .slice(1)
            .map((header, index) => ({ key: allReactions[index], header }))
            .map(({ key, header }) => {
              const count =
                Object.entries(dict[key]).find(
                  ([mid]) => mid === user.id
                )?.[1] || 0;
              return [header, String(count)];
            })
        ),
      };
    }),
  ];

  try {
    return buildSheet({
      sheetId,
      title: `🎁した人 ${dateTimeString()}`,
      command,
      headers,
      rows,
      adjust: async (sheet) => {
        await setSlackEmojiToHeaders(sheet, replacedReactions);
        return updateProperties(sheet, headers);
      },
    });
  } catch (e) {
    Log.error(`buildSheetMembersReacted Error: ${e}`);
  }
};
