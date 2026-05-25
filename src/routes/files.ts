import { Hono } from "hono";
import { parseBucketPath } from "../utils/bucket";
import { verifyTurnstile } from "../middleware/turnstile";
import type { Env, R2FileInfo } from "../types";

const files = new Hono<{ Bindings: Env }>();

files.get("/children/*", async (c) => {
  const [bucket, bucketPath] = parseBucketPath(c.req.raw, c.env);
  const prefix = bucketPath ? `${bucketPath}/` : "";
  if (!bucket || prefix.startsWith("_$flaredrive$/")) {
    return c.text("Not found", 404);
  }

  const objList = await bucket.list({
    prefix,
    delimiter: "/",
  });

  const objects: R2FileInfo[] = objList.objects
    .filter((obj: any) => !obj.key.endsWith("/_$folder$"))
    .map((obj: any) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
    }));

  let folders = objList.delimitedPrefixes as string[];
  if (!bucketPath) {
    folders = folders.filter((f: string) => f !== "_$flaredrive$/");
  }

  return c.json({ value: objects, folders });
});

files.put("/items/*", async (c) => {
  if (!(await verifyTurnstile(c.req.raw, c.env))) {
    return c.text("Turnstile verification failed", 403);
  }

  const [bucket, bucketPath] = parseBucketPath(c.req.raw, c.env);
  if (!bucket) return c.text("Not found", 404);

  const url = new URL(c.req.url);
  const searchParams = url.searchParams;

  if (searchParams.has("uploadId")) {
    const uploadId = searchParams.get("uploadId")!;
    const multipartUpload = await bucket.resumeMultipartUpload(bucketPath, uploadId);
    const partNumber = parseInt(searchParams.get("partNumber") || "0");
    const uploadedPart = await multipartUpload.uploadPart(partNumber, c.req.raw.body!);
    return new Response(null, {
      headers: { "Content-Type": "application/json", etag: uploadedPart.etag },
    });
  }

  let content: any = c.req.raw.body;
  const customMetadata: Record<string, string> = {};

  const copySource = c.req.header("x-amz-copy-source");
  if (copySource) {
    const sourceName = decodeURIComponent(copySource);
    const source = await bucket.get(sourceName);
    content = source?.body;
    if (source?.customMetadata?.thumbnail) {
      customMetadata.thumbnail = source.customMetadata.thumbnail;
    }
  }

  const thumbnail = c.req.header("fd-thumbnail");
  if (thumbnail) customMetadata.thumbnail = thumbnail;

  const obj = await bucket.put(bucketPath, content, { customMetadata });
  return c.json({ key: obj.key, size: obj.size, uploaded: obj.uploaded });
});

files.post("/items/*", async (c) => {
  if (!(await verifyTurnstile(c.req.raw, c.env))) {
    return c.text("Turnstile verification failed", 403);
  }

  const [bucket, bucketPath] = parseBucketPath(c.req.raw, c.env);
  if (!bucket) return c.text("Not found", 404);

  const url = new URL(c.req.url);
  const searchParams = url.searchParams;

  if (searchParams.has("uploads")) {
    const customMetadata: Record<string, string> = {};
    const thumbnail = c.req.header("fd-thumbnail");
    if (thumbnail) customMetadata.thumbnail = thumbnail;

    const multipartUpload = await bucket.createMultipartUpload(bucketPath, {
      httpMetadata: { contentType: c.req.header("content-type") },
      customMetadata,
    });

    return c.json({ key: multipartUpload.key, uploadId: multipartUpload.uploadId });
  }

  if (searchParams.has("uploadId")) {
    const uploadId = searchParams.get("uploadId")!;
    const multipartUpload = await bucket.resumeMultipartUpload(bucketPath, uploadId);
    const body: { parts: Array<any> } = await c.req.json();

    try {
      const object = await multipartUpload.complete(body.parts);
      return new Response(null, { headers: { etag: object.httpEtag } });
    } catch (error: any) {
      return c.text(error.message, 400);
    }
  }

  return c.text("Method not allowed", 405);
});

files.delete("/items/*", async (c) => {
  if (!(await verifyTurnstile(c.req.raw, c.env))) {
    return c.text("Turnstile verification failed", 403);
  }

  const [bucket, bucketPath] = parseBucketPath(c.req.raw, c.env);
  if (!bucket) return c.text("Not found", 404);

  await bucket.delete(bucketPath);
  return new Response(null, { status: 204 });
});

export default files;
