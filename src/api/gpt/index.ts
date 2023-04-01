import { Configuration, CreateCompletionRequest, OpenAIApi } from 'openai';
import * as Log from '../../lib/log';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  basePath: process.env.OPENAI_API_BASE,
});
const openai = new OpenAIApi(configuration);

export const chatWithGpt = async (
  prompt: string,
  request: Omit<CreateCompletionRequest, 'prompt'> = {
    model: 'text-davinci-003',
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
        params: { 'api-version': '2022-12-01' },
        headers: {
          'api-key': process.env.OPENAI_API_KEY!,
        },
      }
    );
    Log.debug(completion.data);
    return completion;
  } catch (e) {
    Log.error(e.toJSON());
  }
};
