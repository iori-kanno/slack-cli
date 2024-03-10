import { Log } from '@/lib/log';
import {
  GoogleSpreadsheet,
  ServiceAccountCredentials,
} from 'google-spreadsheet';

export const spreadSheetClient = (sheetId: string) => {
  const doc = new GoogleSpreadsheet(sheetId);
  try {
    const credential = require('../../../.spreadsheet-credential.json');
    doc.useServiceAccountAuth(credential as ServiceAccountCredentials);
    return doc;
  } catch (e) {
    Log.error(`GoogleSpreadsheet Error: ${e}`);
    return;
  }
};
