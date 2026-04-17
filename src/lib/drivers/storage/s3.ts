/**
 * S3-compat Storage driver — funciona com MinIO, AWS S3, R2, etc.
 *
 * Usado no perfil full do self-hosted com container MinIO. Qualquer
 * endpoint S3-compatible funciona — basta setar STORAGE_S3_ENDPOINT.
 *
 * Envs:
 *   STORAGE_S3_ENDPOINT     — URL do endpoint (ex: http://minio:9000)
 *   STORAGE_S3_REGION       — regiao (default: us-east-1)
 *   STORAGE_S3_ACCESS_KEY   — access key (MinIO root user)
 *   STORAGE_S3_SECRET_KEY   — secret key (MinIO root password)
 *   STORAGE_S3_BUCKET_PREFIX — prefixo nos nomes de bucket (default: "taskflow-")
 *
 * Cada bucket do app (wiki, anexos, reunioes-audio) vira um bucket S3
 * com nome "{prefix}{bucket}" (ex: taskflow-wiki, taskflow-anexos).
 * Os buckets sao criados automaticamente no primeiro upload se nao
 * existirem (MinIO suporta auto-create).
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";

import type {
  SignedUploadResult,
  StorageDriver,
  StorageStream,
  UploadOptions,
  UploadResult,
} from "./types";

export class S3CompatStorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly prefix: string;
  private readonly endpoint: string;
  private readonly ensuredBuckets = new Set<string>();

  constructor() {
    const endpoint = process.env.STORAGE_S3_ENDPOINT;
    if (!endpoint) {
      throw new Error("STORAGE_S3_ENDPOINT obrigatorio pra STORAGE_DRIVER=s3-compat");
    }
    const accessKey = process.env.STORAGE_S3_ACCESS_KEY;
    const secretKey = process.env.STORAGE_S3_SECRET_KEY;
    if (!accessKey || !secretKey) {
      throw new Error("STORAGE_S3_ACCESS_KEY e STORAGE_S3_SECRET_KEY obrigatorios");
    }

    this.endpoint = endpoint.replace(/\/$/, "");
    this.prefix = process.env.STORAGE_S3_BUCKET_PREFIX ?? "taskflow-";

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: process.env.STORAGE_S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // necessario pra MinIO e endpoints custom
    });
  }

  private s3Bucket(bucket: string): string {
    return `${this.prefix}${bucket}`;
  }

  private async ensureBucket(bucket: string): Promise<void> {
    const s3Bucket = this.s3Bucket(bucket);
    if (this.ensuredBuckets.has(s3Bucket)) return;

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: s3Bucket }));
      } catch (err) {
        // BucketAlreadyOwnedByYou — race condition, outro request criou
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("BucketAlreadyOwnedByYou") && !msg.includes("BucketAlreadyExists")) {
          throw err;
        }
      }
    }
    this.ensuredBuckets.add(s3Bucket);
  }

  async upload(
    bucket: string,
    path: string,
    data: Uint8Array | Buffer,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    await this.ensureBucket(bucket);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket(bucket),
        Key: path,
        Body: data,
        ContentType: options?.contentType ?? "application/octet-stream",
      }),
    );

    return { path };
  }

  async delete(bucket: string, path: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket(bucket),
          Key: path,
        }),
      );
    } catch {
      // Idempotente — no-op se nao existe
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    // Pra MinIO com public policy, URL direta funciona.
    // Pra buckets privados, usar createSignedDownloadUrl.
    // Em self-hosted, o endpoint e acessivel da LAN.
    const publicEndpoint =
      process.env.STORAGE_S3_PUBLIC_ENDPOINT ?? this.endpoint;
    return `${publicEndpoint}/${this.s3Bucket(bucket)}/${encodeURI(path)}`;
  }

  async createSignedDownloadUrl(
    bucket: string,
    path: string,
    expiresInSec: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.s3Bucket(bucket),
      Key: path,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSec });
  }

  async createSignedUploadUrl(
    bucket: string,
    path: string,
    expiresInSec: number,
  ): Promise<SignedUploadResult> {
    await this.ensureBucket(bucket);
    const command = new PutObjectCommand({
      Bucket: this.s3Bucket(bucket),
      Key: path,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSec,
    });
    return { url, token: "", path };
  }

  async getStream(bucket: string, path: string): Promise<StorageStream | null> {
    try {
      // Head first pra pegar metadata sem download
      const head = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.s3Bucket(bucket),
          Key: path,
        }),
      );

      const get = await this.client.send(
        new GetObjectCommand({
          Bucket: this.s3Bucket(bucket),
          Key: path,
        }),
      );

      if (!get.Body) return null;

      // AWS SDK retorna Readable (Node) — converter pra ReadableStream (Web)
      const nodeStream = get.Body as Readable;
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

      return {
        stream: webStream,
        size: head.ContentLength ?? 0,
        contentType: head.ContentType,
        lastModified: head.LastModified,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("NoSuchKey") || msg.includes("NotFound") || msg.includes("404")) {
        return null;
      }
      throw err;
    }
  }
}
