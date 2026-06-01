import { z } from 'zod';
import * as fs from 'fs';
import { submitEditJob } from '../lib/imageRunner';

export const editImageSchema = z.object({
  prompt: z.string().min(1).describe('Description of the edit to make'),
  image_path: z
    .string()
    .describe(
      'Absolute path to the source image file. If the user pasted an image into the chat, use the file path Claude receives for that attachment.'
    ),
  size: z
    .enum(['auto', '1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '3840x2160', '2160x3840'])
    .default('auto')
    .describe('Image dimensions. auto = model picks the best size, 1024x1024 = square, 1024x1536 = portrait, 1536x1024 = landscape, 2048x2048 = large square, 2048x1152 = wide landscape, 3840x2160 = 4K landscape, 2160x3840 = 4K portrait'),
  quality: z
    .enum(['auto', 'low', 'medium', 'high'])
    .default('auto')
    .describe('Generation quality. auto = model picks best quality (default), low = fast and cheap, medium = balanced, high = best quality but slower and costs more'),
});

export type EditImageInput = z.infer<typeof editImageSchema>;

export function editImage(input: EditImageInput): string {
  if (!fs.existsSync(input.image_path)) {
    return JSON.stringify({
      error: `File not found: ${input.image_path}`,
      hint: 'Pass the absolute path to the image file. If the user pasted an image, use the path Claude received for that attachment.',
    });
  }

  const jobId = submitEditJob({
    prompt: input.prompt,
    imagePath: input.image_path,
    size: input.size,
    quality: input.quality,
  });

  return JSON.stringify({
    job_id: jobId,
    status: 'pending',
    message: `Edit started. Call poll_image_job with job_id "${jobId}" to check progress. gpt-image-2 processes image inputs at high fidelity automatically.`,
  });
}
