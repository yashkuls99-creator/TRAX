import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import { env } from "../config/env";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  },
});

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({ Bucket: env.r2BucketName, Key: key, Body: body, ContentType: contentType })
  );
}

export async function getObjectStream(key: string): Promise<Readable> {
  const result = await r2Client.send(new GetObjectCommand({ Bucket: env.r2BucketName, Key: key }));
  return result.Body as Readable;
}

export async function deleteObject(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: env.r2BucketName, Key: key }));
}
