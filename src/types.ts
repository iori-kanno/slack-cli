export type CliExecFn = (argv?: string[]) => void;
export type SlackDemoOptions = {
  asBot?: boolean;
  dryRun?: boolean;
  noMention?: boolean;
  startDate?: Date;
  endDate?: Date;
};
