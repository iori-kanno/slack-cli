import { Configuration, CreateCompletionRequest, OpenAIApi } from 'openai';
import * as Log from '../../lib/log';

const DEFAULT_MODEL = 'text-davinci-003' as const;
const DEFAULT_API_VERSION = '2022-12-01' as const;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  basePath: process.env.OPENAI_API_BASE,
});
const openai = new OpenAIApi(configuration);

export const chatWithGpt = async (
  prompt: string,
  request: Omit<CreateCompletionRequest, 'prompt'> = {
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    max_tokens: 2048,
    n: 1,
    stop: null,
    temperature: 0,
  }
) => {
  try {
    const completion = await openai.createCompletion(
      {
        ...request,
        prompt,
      },
      {
        params: {
          'api-version': process.env.OPENAI_API_VERSION ?? DEFAULT_API_VERSION,
        },
        headers: {
          'api-key': process.env.OPENAI_API_KEY!,
        },
      }
    );
    Log.debug(completion.data);
    return completion;
  } catch (e) {
    Log.error(e);
  }
};

export const validate = () => {
  if (!process.env.OPENAI_API_KEY) {
    Log.error('OPENAI_API_KEY is not set');
    return false;
  }
  if (!process.env.OPENAI_API_BASE) {
    Log.error('OPENAI_API_BASE is not set');
    return false;
  }
  if (!process.env.OPENAI_MODEL) {
    Log.warn(`OPENAI_MODEL is not set, use default model: ${DEFAULT_MODEL}`);
  } else {
    Log.debug(`OPENAI_MODEL is set: ${process.env.OPENAI_MODEL}`);
  }
  if (!process.env.OPENAI_API_VERSION) {
    Log.warn(
      `OPENAI_API_VERSION is not set, use default version: ${DEFAULT_API_VERSION}`
    );
  } else {
    Log.debug(`OPENAI_API_VERSION is set: ${process.env.OPENAI_API_VERSION}`);
  }
  return true;
};
