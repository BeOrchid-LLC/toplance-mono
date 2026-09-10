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

/**
 * One client for the process, not one per call.
 *
 * An `S3Client` owns the connection pool, so a fresh one per call is a
 * fresh TCP connection and TLS handshake per object — nothing is ever
 * kept alive to reuse. That is invisible against MinIO on loopback and
 * is not invisible against R2 across the internet, which is where the
 * archive route pays it: it fetches every document on a checklist in
 * turn, and until the first of them is in hand there is no byte of ZIP
 * to write, no response headers, and so nothing at all on the
 * traveller's screen.
 *
 * Built on first use rather than at import, so the missing-endpoint
 * error below still belongs to the caller that needed the bucket rather
 * than to whatever module happened to be imported first. The `S3_*`
 * variables are read once for the life of the process, which is what
 * they already were — nothing rewrites them at runtime.
 */
let shared: S3Client | null = null;

function client() {
  if (shared) return shared;

  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) {
    throw new Error("S3_ENDPOINT is not set. See .env.local.example.");
  }

  shared = new S3Client({
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

  return shared;
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

/**
 * Read-only sibling of `putDocument`, for the AI pre-check — the only
 * caller that needs the bytes themselves rather than a link a browser can
 * follow. Same client and bucket config as everything else in this file.
 */
export async function getDocumentBytes(
  path: string
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const response = await client().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: path })
  );
  const bytes = (await response.Body?.transformToByteArray()) ?? new Uint8Array();
  return { bytes, contentType: response.ContentType ?? null };
}
