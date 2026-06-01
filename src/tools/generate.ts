import { z } from 'zod';
import { submitGenerateJob } from '../lib/imageRunner';

export const generateImageSchema = z.object({
  prompt: z.string().min(1).describe('Description of the image to generate'),
  size: z
    .enum(['auto', '1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '3840x2160', '2160x3840'])
    .default('auto')
    .describe('Image dimensions. auto = model picks the best size, 1024x1024 = square, 1024x1536 = portrait, 1536x1024 = landscape, 2048x2048 = large square, 2048x1152 = wide landscape, 3840x2160 = 4K landscape, 2160x3840 = 4K portrait'),
  quality: z
    .enum(['auto', 'low', 'medium', 'high'])
    .default('auto')
    .describe('Generation quality. auto = model picks best quality (default), low = fast and cheap, medium = balanced, high = best quality but slower and costs more'),
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
    message: `Generation started. Call poll_image_job with job_id "${jobId}" to check progress. gpt-image-2 typically takes 15–90 seconds; complex prompts may take up to 2 minutes.`,
  });
}
