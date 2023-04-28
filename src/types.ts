import { ChatPostMessageArguments } from '@slack/web-api';

type Progress = {
  message: string;
  /** 0-100 */
  percent: number;
};
type ProgressCallback = (progress: Progress) => void;

export type Commands = { [command: string]: CliExecFn };
export type ExecOptions = {
  canNotifyUpdate: boolean;
  progress?: ProgressCallback;
};
type CliError = string;
type Response =
  | undefined
  | {
      text?: string;
      postArg?: ChatPostMessageArguments;
      error?: CliError;
      /** asUser は cli でのみ利用可能 */
      asUser?: boolean;
    };

export type CliExecFn = (
  argv?: string[],
  progress?: ProgressCallback
) => Promise<Response> | Response;
export type SlackDemoOptions = {
  asBot?: boolean;
  dryRun?: boolean;
  noMention?: boolean;
  startDate?: Date;
  endDate?: Date;
};
