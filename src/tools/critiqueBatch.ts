import { z } from 'zod';
import OpenAI from 'openai';
import { getApiKey } from '../config';
import { buildCritiquePrompt } from '../lib/prompts';

export const critiqueBatchSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe('Label for this item in the results'),
        thinking: z.string().min(50),
        context: z.string().optional(),
      })
    )
    .min(1)
    .describe('Array of reasoning items to critique in parallel'),
  model: z.string().default('gpt-4o'),
});

export type CritiqueBatchInput = z.infer<typeof critiqueBatchSchema>;

export async function chatgptCritiqueBatch(input: CritiqueBatchInput): Promise<string> {
  const openai = new OpenAI({ apiKey: getApiKey() });

  const results = await Promise.all(
    input.items.map(async (item) => {
      const prompt = buildCritiquePrompt(item.thinking, item.context);
      const response = await openai.chat.completions.create({
        model: input.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      });
      return {
        name: item.name,
        critique: response.choices[0]?.message?.content ?? 'No response.',
      };
    })
  );

  return JSON.stringify(results, null, 2);
}
