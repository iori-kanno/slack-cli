import fs from 'fs';
import { Log } from '@/lib/log';
import {
  GoogleSpreadsheet,
  ServiceAccountCredentials,
} from 'google-spreadsheet';

export const spreadSheetClient = async (
  sheetId: string
): Promise<GoogleSpreadsheet | undefined> => {
  const doc = new GoogleSpreadsheet(sheetId);
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(
        `${process.cwd()}/` +
          (process.env.GOOGLE_CREDENTIAL_FILE_PATH ||
            '.spreadsheet-credential.json'),
        (err, data) => {
          if (err) {
            Log.error(
              `Tried to create a spreadsheet, but .spreadsheet-credential.json was not found in the project root.\nGoogleSpreadsheet Error: ${err}`
            );
            reject();
            return;
          }
          const credential = JSON.parse(data.toString());
          doc.useServiceAccountAuth(credential as ServiceAccountCredentials);
          resolve(doc);
        }
      );
    } catch (e) {
      Log.error(`spreadSheetClient Error: ${e}`);
      reject();
    }
  });
};
