import { Log } from '@/lib/log';
import { SlackDemoOptions } from '@/types';

type Args = {
  channelId: string;
  latestPostDate: string;
};

export const archiveChannel = async (
  args: Args,
  options?: SlackDemoOptions
) => {
  if (options?.dryRun) {
    Log.success(`[dry-run] ${args.channelId} will be archived.`);
    return;
  }
  const url = process.env.SLACK_ARCHIVE_WORKFLOW_WEBHOOK_URL;
  if (!url) {
    Log.error('SLACK_ARCHIVE_WORKFLOW_WEBHOOK_URL is required.');
    process.exit(1);
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel_id: args.channelId,
      latest_post_date: args.latestPostDate,
    }),
  }).then((res) => res.json());

  return response;
};
