import { z } from 'zod';
import { getJob } from '../lib/imageRunner';

export const pollImageJobSchema = z.object({
  job_id: z.string().describe('Job ID returned by generate_image or edit_image'),
});

export type PollImageJobInput = z.infer<typeof pollImageJobSchema>;

export interface PollResult {
  text: string;
  imageBase64?: string;
}

export function pollImageJob(input: PollImageJobInput): PollResult {
  const job = getJob(input.job_id);

  if (!job) {
    return {
      text: JSON.stringify({
        status: 'not_found',
        error: 'Job not found. It may have expired (jobs are kept for 24 hours) or the server was restarted.',
      }),
    };
  }

  if (job.status === 'pending') {
    return {
      text: JSON.stringify({
        status: 'pending',
        job_id: input.job_id,
        message: 'Still generating. Poll again in a few seconds.',
      }),
    };
  }

  if (job.status === 'failed') {
    return {
      text: JSON.stringify({
        status: 'failed',
        job_id: input.job_id,
        error: job.error,
      }),
    };
  }

  return {
    text: JSON.stringify({
      status: 'complete',
      job_id: input.job_id,
      file_path: job.result!.filePath,
      model: job.result!.model,
      size: job.result!.size,
      message: `Image saved to ${job.result!.filePath}`,
    }),
    imageBase64: job.result!.base64,
  };
}
