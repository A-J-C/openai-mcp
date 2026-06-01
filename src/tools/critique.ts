import { z } from 'zod';
import OpenAI from 'openai';
import { getApiKey } from '../config';
import { buildCritiquePrompt } from '../lib/prompts';

export const critiqueSchema = z.object({
  thinking: z
    .string()
    .min(50)
    .describe('The reasoning, plan, or argument to critique (minimum 50 characters)'),
  context: z.string().optional().describe('Optional background context to help ChatGPT understand the domain'),
  model: z.string().default('gpt-4o').describe('GPT model to use (default: gpt-4o)'),
});

export type CritiqueInput = z.infer<typeof critiqueSchema>;

export async function chatgptCritique(input: CritiqueInput): Promise<string> {
  const openai = new OpenAI({ apiKey: getApiKey() });
  const prompt = buildCritiquePrompt(input.thinking, input.context);

  const response = await openai.chat.completions.create({
    model: input.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content ?? 'No response from ChatGPT.';
}
