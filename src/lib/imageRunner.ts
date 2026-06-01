import OpenAI, { toFile } from 'openai';
import * as fs from 'fs';
import { getApiKey } from '../config';
import { saveImageToDownloads } from './fileOutput';

export type JobStatus = 'pending' | 'complete' | 'failed';

export interface JobResult {
  base64: string;
  filePath: string;
  model: string;
  size: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  result?: JobResult;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, Job>();

function makeJobId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function evictOldJobs(): void {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.status !== 'pending' && job.createdAt < cutoff) {
      jobs.delete(id);
    }
  }
}

function extractBase64(data: OpenAI.Images.Image | undefined): string | null {
  if (data?.b64_json) return data.b64_json;
  return null;
}

export function submitGenerateJob(params: {
  prompt: string;
  size: string;
  quality: string;
}): string {
  const id = makeJobId();
  jobs.set(id, { id, status: 'pending', createdAt: Date.now() });

  (async () => {
    try {
      const openai = new OpenAI({ apiKey: getApiKey() });
      const response = await openai.images.generate({
        model: 'gpt-image-2',
        prompt: params.prompt,
        n: 1,
        size: params.size as any,
        quality: params.quality as 'auto' | 'low' | 'medium' | 'high',
      });

      const b64 = extractBase64(response.data?.[0]);
      if (!b64) throw new Error('No image data in response');

      const filePath = await saveImageToDownloads(b64, id);
      jobs.set(id, {
        id,
        status: 'complete',
        result: { base64: b64, filePath, model: 'gpt-image-2', size: params.size },
        createdAt: Date.now(),
      });
    } catch (err) {
      jobs.set(id, {
        id,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        createdAt: Date.now(),
      });
    }
  })();

  return id;
}

export function submitEditJob(params: {
  prompt: string;
  imagePath: string;
  size: string;
  quality: string;
}): string {
  const id = makeJobId();
  jobs.set(id, { id, status: 'pending', createdAt: Date.now() });

  (async () => {
    try {
      const openai = new OpenAI({ apiKey: getApiKey() });
      const imageFile = await toFile(
        fs.createReadStream(params.imagePath),
        'image.png',
        { type: 'image/png' }
      );

      const response = await openai.images.edit({
        model: 'gpt-image-2',
        image: imageFile,
        prompt: params.prompt,
        n: 1,
        size: params.size as any,
      });

      const b64 = extractBase64(response.data?.[0]);
      if (!b64) throw new Error('No image data in response');

      const filePath = await saveImageToDownloads(b64, id);
      jobs.set(id, {
        id,
        status: 'complete',
        result: { base64: b64, filePath, model: 'gpt-image-2', size: params.size },
        createdAt: Date.now(),
      });
    } catch (err) {
      jobs.set(id, {
        id,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        createdAt: Date.now(),
      });
    }
  })();

  return id;
}
