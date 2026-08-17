import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY || '',
    secretAccessKey: process.env.R2_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET || '';
// Public base URL of the bucket (r2.dev subdomain or custom domain).
// The S3 API endpoint is not publicly readable, so it cannot be used for image URLs.
const PUBLIC_BASE_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

export async function uploadToR2(file: Buffer, fileName: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: contentType,
  });

  if (!PUBLIC_BASE_URL) {
    throw new Error('R2_PUBLIC_URL is not configured; uploaded images would not be reachable');
  }

  await r2Client.send(command);

  return `${PUBLIC_BASE_URL}/${fileName}`;
}

export async function deleteFromR2(fileName: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
  });

  await r2Client.send(command);
}

export function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}
