export const SHEET_ID = '1LkSFKOWOhjWYfY9BGqsYDlK4ey9us9mx6xY0HG3Ne3Q';

export const valueMap = {
  zekkoucho: 5,
  koucho: 4,
  hutsuu: 3,
  hucho: 2,
  zehhucho: 1,
};

export const blockTemplates = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*回答時の調子を教えてください*',
    },
  },
  {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: ':zekkoucho: 絶好調',
        },
        value: valueMap['zekkoucho'].toString(),
        action_id: 'hearing_button_5',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: ':koucho: 好調',
        },
        value: valueMap['koucho'].toString(),
        action_id: 'hearing_button_4',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: ':hutsuu: 普通',
        },
        value: valueMap['hutsuu'].toString(),
        action_id: 'hearing_button_3',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: ':hucho: 不調',
        },
        value: valueMap['hucho'].toString(),
        action_id: 'hearing_button_2',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: ':zehhucho: 絶不調',
        },
        value: valueMap['zehhucho'].toString(),
        action_id: 'hearing_button_1',
      },
    ],
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: ':notion-official: <https://www.notion.so/ivry-jp/232df270438d481faa60168dd662c3ef|パルスチェックシステムについて>',
      },
    ],
  },
];
