export type CliExecFn = (argv?: string[]) => void;
export type SlackDemoOptions = {
  asBot?: boolean;
  dryRun?: boolean;
  startDate?: Date;
  endDate?: Date;
};
