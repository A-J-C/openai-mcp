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
    .enum(['1024x1024', '1024x1536', '1536x1024'])
    .default('1024x1024'),
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
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
    message: `Edit started. Call poll_image_job with job_id "${jobId}" to check progress.`,
  });
}
