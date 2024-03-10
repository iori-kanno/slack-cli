import { commandListText } from '@/lib/messages';
import { CliExecFn } from '@/types';

export const exec: CliExecFn = () => {
  return { text: commandListText };
};
