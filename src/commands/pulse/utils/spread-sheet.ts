import { spreadSheetClient } from '../../../api/spreadsheet/client';
import { SlackDemoOptions } from '../../../types';
import * as Log from '../../../lib/log';
import { SHEET_ID } from './constants';

export const loadUserIds = async (options?: SlackDemoOptions) => {
  const client = spreadSheetClient(SHEET_ID);
  if (!client) return;
  try {
    await client.loadInfo();
    Log.debug(`SpreadSheet: ${client.title}(id: ${client.spreadsheetId})`);

    const sheet = client.sheetsById['0'];
    await sheet.loadCells();
    const rows = await sheet.getRows();
    const userIds = rows
      .filter((row) => (row.Target as string) === '○')
      .map((row) => row.UserId as string);
    return userIds;
  } catch (e) {
    Log.error(`loadUserIds Error: ${e}`);
  }
};

type Args = {
  userId: string;
  header: string;
  value: number;
};

export const updateSheet = async (
  { userId, header, value }: Args,
  options?: SlackDemoOptions
) => {
  const client = spreadSheetClient(SHEET_ID);
  if (!client) return;
  try {
    await client.loadInfo();
    Log.debug(`SpreadSheet: ${client.title}(id: ${client.spreadsheetId})`);

    const sheet = client.sheetsByIndex[0];
    await sheet.loadCells();

    const rows = await sheet.getRows();
    const targetRow = rows.find((row) => row.UserId === userId);
    if (!targetRow) return;
    targetRow[header] = value;
    await targetRow.save();
  } catch (e) {
    Log.error(`updateSheet Error: ${e}`);
  }
};
