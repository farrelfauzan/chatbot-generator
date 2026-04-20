import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { appConfig } from '../app.config';
import { randomBytes } from 'crypto';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket = appConfig.s3.bucket;
  private readonly prefix = appConfig.s3.prefix;

  constructor() {
    this.client = new S3Client({
      region: appConfig.s3.region,
      credentials: {
        accessKeyId: appConfig.s3.accessKeyId,
        secretAccessKey: appConfig.s3.secretAccessKey,
      },
    });
  }

  private buildKey(filename: string): string {
    const ext = filename.split('.').pop() ?? 'jpg';
    const unique = `${Date.now()}-${randomBytes(4).toString('hex')}`;
    return `${this.prefix}/${unique}.${ext}`;
  }

  async upload(
    file: Buffer,
    filename: string,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    const key = this.buildKey(filename);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      }),
    );

    const url = `${appConfig.s3.cdnDomain}/${key}`;
    this.logger.log(`Uploaded ${key} → ${url}`);
    return { key, url };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted ${key}`);
  }

  async getPresignedUploadUrl(
    filename: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
    const key = this.buildKey(filename);

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );

    const publicUrl = `${appConfig.s3.cdnDomain}/${key}`;
    return { key, uploadUrl, publicUrl };
  }
}
