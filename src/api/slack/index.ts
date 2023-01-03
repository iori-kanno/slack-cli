import { WebClient } from '@slack/web-api';

export const userClient = new WebClient(process.env.SLACK_TOKEN, {
  teamId: process.env.SLACK_TEAM_ID,
});
export const botClient = new WebClient(process.env.SLACK_BOT_TOKEN, {
  teamId: process.env.SLACK_TEAM_ID,
});
