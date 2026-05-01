import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;

function r2(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials missing — set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  }

  // R2_JURISDICTION optional override: "eu" | "fedramp". Default = no jurisdiction (US).
  // Cloudflare requires jurisdiction-specific endpoints for buckets in those regions.
  const jurisdiction = process.env.R2_JURISDICTION;
  const host = jurisdiction
    ? `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
    : `${accountId}.r2.cloudflarestorage.com`;

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${host}`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function bucket(): string {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error("R2_BUCKET env var missing");
  return b;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getR2Object(key: string) {
  const res = await r2().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  if (!res.Body) throw new Error(`R2 object not found or empty: ${key}`);
  return res.Body as ReadableStream<Uint8Array> & { transformToWebStream: () => ReadableStream<Uint8Array> };
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key })
  );
}
