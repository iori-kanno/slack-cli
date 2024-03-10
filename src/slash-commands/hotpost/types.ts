export type Hotpost = {
  id?: number;
  channel: string;
  ts: string;
  reactionCount: number;
  reactions: {
    [name: string]: number;
  };
  usersCount: number;
  users: string[];

  isEarly: boolean;
  isHot: boolean;
  updatedAt: number;
};
