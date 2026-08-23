import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Creates the documents bucket if it is not there yet.
 *
 * Written against the S3 API rather than `docker exec … mc mb`, because
 * the same command then works on whatever the platform team provisions:
 * there is no container to exec into in staging or production, and no
 * guarantee the vendor ships MinIO's client.
 *
 * Deliberately not called from application code. A process that creates
 * its own bucket on first write will happily create one from a typo in a
 * config value and report success.
 */
const endpoint = process.env.S3_ENDPOINT;
if (!endpoint) throw new Error("S3_ENDPOINT is not set. See .env.local.example.");

const bucket = process.env.S3_BUCKET ?? "documents";

const s3 = new S3Client({
  endpoint,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`Bucket "${bucket}" already exists at ${endpoint}.`);
} catch {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Created bucket "${bucket}" at ${endpoint}.`);
}

// Buckets are private by default and stay that way. Documents are only
// ever reached through a signed URL minted by a guarded server action.
