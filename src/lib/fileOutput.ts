import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function saveImageToDownloads(base64: string, jobId: string): Promise<string> {
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `openai-${timestamp}-${jobId.slice(-8)}.png`;
  const filePath = path.join(downloadsDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(base64, 'base64'));
  return filePath;
}
