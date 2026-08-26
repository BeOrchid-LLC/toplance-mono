import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Documents live in an S3-compatible bucket: MinIO locally, Cloudflare
 * R2 in staging and production. Talking to the S3 API rather than a
 * vendor SDK keeps that a matter of configuration — the store has been
 * answered three different ways and this file has not changed for any of
 * them.
 *
 * Nothing here decides who may touch an object. Callers reach it only
 * through guarded server actions, which is where the per-application
 * ownership check lives — see `@/lib/auth/guards`.
 */
const BUCKET = process.env.S3_BUCKET ?? "documents";

function client() {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) {
    throw new Error("S3_ENDPOINT is not set. See .env.local.example.");
  }

  return new S3Client({
    endpoint,
    // R2 wants "auto" and rejects AWS region names; MinIO ignores this.
    region: process.env.S3_REGION ?? "us-east-1",
    // MinIO and R2 both serve buckets as a path, not a subdomain.
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function putDocument(path: string, file: File): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    })
  );
}

/**
 * A short-lived URL, because the bucket is private and a document is a
 * passport. Ten minutes is long enough to open one and short enough that
 * a copied link is not a standing grant — anyone who gets hold of the
 * URL has it until it expires, so this window is the whole of the
 * protection once the link leaves our process.
 */
export async function signedDocumentUrl(path: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: BUCKET, Key: path }),
    { expiresIn: 600 }
  );
}

export async function deleteDocument(path: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: path }));
}
