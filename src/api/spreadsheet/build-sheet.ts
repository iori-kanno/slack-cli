import { spreadSheetClient } from '@/api/spreadsheet/client';
import { GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { Log } from '@/lib/log';

type SheetArg = {
  sheetId: string;
  title: string;
  /** ヘッダー上部に実行コマンドを追加したい場合指定する */
  command?: string;
  headers: string[];
  rows: { [header: string]: string | number }[];
  /** 出力がどんなデータなのか知っているのは呼び出し元なので調整できるようにする */
  adjust?: (sheet: GoogleSpreadsheetWorksheet) => Promise<void>;
};

type SheetUrl = string;

export const buildSheet = async ({
  sheetId,
  title,
  command,
  headers,
  rows,
  adjust,
}: SheetArg): Promise<SheetUrl | undefined> => {
  const client = spreadSheetClient(sheetId);
  if (!client) return;
  await client.loadInfo();
  Log.debug(`SpreadSheet: ${client.title}(id: ${client.spreadsheetId})`);
  const sheet = await client.addSheet({ title });

  // 作成したシートがタブの一番左に来るようにする
  await sheet.updateProperties({ index: 0 });
  // デフォルトで作成されるサイズを超えるとエラーになるのでリサイズしておく
  await sheet.resize({
    rowCount: rows.length + 2,
    columnCount: Math.max(headers.length, 26),
  });
  await sheet.setHeaderRow(headers, command ? 2 : 1);
  await sheet.addRows(rows, { raw: true, insert: false });

  if (command) {
    await sheet.loadCells();
    const cell = sheet.getCell(0, 0);
    cell.value = command;
    await sheet.saveUpdatedCells();
  }
  if (adjust) await adjust(sheet);

  Log.debug(
    `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${sheet.sheetId}`
  );
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${sheet.sheetId}`;
};
