import { WebClient } from '@slack/web-api';

export const userClient = new WebClient(process.env.SLACK_TOKEN);
export const botClient = new WebClient(process.env.SLACK_BOT_TOKEN);
