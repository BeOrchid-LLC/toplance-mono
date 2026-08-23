import { afterAll, describe, expect, it } from "vitest";

/**
 * The storage round trip, against the real MinIO container.
 *
 * The bucket is private, so "can I read it back" and "can anyone else"
 * are different questions and both matter: a misconfigured bucket serves
 * passports to the open internet and every one of these operations still
 * succeeds.
 *
 * Skipped without `S3_ENDPOINT`. Run `npm run db:up && npm run db:bucket`
 * to include these.
 */
describe.skipIf(!process.env.S3_ENDPOINT)("document storage", async () => {
  const { deleteDocument, putDocument, signedDocumentUrl } = await import(
    "@/lib/storage/documents"
  );

  const key = "test-application/test-doc/roundtrip.txt";
  const body = "passport page 2";

  afterAll(async () => {
    await deleteDocument(key).catch(() => {});
  });

  it("stores a file and reads it back through a signed URL", async () => {
    await putDocument(key, new File([body], "roundtrip.txt", { type: "text/plain" }));

    const url = await signedDocumentUrl(key);
    const response = await fetch(url);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(body);
  });

  it("refuses the same object without a signature", async () => {
    const url = await signedDocumentUrl(key);
    const unsigned = new URL(url);
    unsigned.search = "";

    const response = await fetch(unsigned);

    // If this ever returns 200 the bucket has been made public, and
    // every signed URL in the app has become decoration.
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("signs for ten minutes, not indefinitely", async () => {
    const url = new URL(await signedDocumentUrl(key));

    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
  });

  it("deletes the object", async () => {
    await deleteDocument(key);

    const response = await fetch(await signedDocumentUrl(key));

    expect(response.status).toBe(404);
  });
});
