import { z } from 'zod';
import { submitGenerateJob } from '../lib/imageRunner';

export const generateImageSchema = z.object({
  prompt: z.string().min(1).describe('Description of the image to generate'),
  size: z
    .enum(['1024x1024', '1024x1536', '1536x1024'])
    .default('1024x1024')
    .describe('Image dimensions. 1024x1024 = square, 1024x1536 = portrait, 1536x1024 = landscape'),
  quality: z
    .enum(['low', 'medium', 'high'])
    .default('medium')
    .describe('Generation quality. Higher = better image, slower, costs more'),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export function generateImage(input: GenerateImageInput): string {
  const jobId = submitGenerateJob({
    prompt: input.prompt,
    size: input.size,
    quality: input.quality,
  });

  return JSON.stringify({
    job_id: jobId,
    status: 'pending',
    message: `Generation started. Call poll_image_job with job_id "${jobId}" to check progress. gpt-image-1 typically takes 15–90 seconds.`,
  });
}
