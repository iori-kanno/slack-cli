import {
  ServiceAccountCredentials,
  GoogleSpreadsheet,
} from 'google-spreadsheet';
import * as Log from '../../lib/log';

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
