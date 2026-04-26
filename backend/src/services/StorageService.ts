import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import path from 'path';
import fs from 'fs';

export class StorageService {
  private s3?: S3Client;

  constructor() {
    if (env.STORAGE_MODE === 's3' && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      this.s3 = new S3Client({
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
        region: 'ap-south-1',
      });
    }
  }

  async uploadFile(filePath: string, key: string): Promise<string> {
    if (env.STORAGE_MODE === 's3' && this.s3 && env.AWS_S3_BUCKET) {
      const fileContent = fs.readFileSync(filePath);
      await this.s3.send(new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: fileContent,
      }));
      return `s3://${env.AWS_S3_BUCKET}/${key}`;
    }

    // Local storage
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const dest = path.join(uploadDir, key);
    fs.copyFileSync(filePath, dest);
    return dest;
  }

  async getFile(key: string): Promise<Buffer> {
    if (env.STORAGE_MODE === 's3' && this.s3 && env.AWS_S3_BUCKET) {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
      }));
      const stream = response.Body as any;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    return fs.readFileSync(key);
  }

  async deleteFile(key: string): Promise<void> {
    if (env.STORAGE_MODE !== 's3') {
      if (fs.existsSync(key)) fs.unlinkSync(key);
    }
  }
}
