import { Hono } from "hono";
import { S3Client } from "../utils/s3";
import type { Env } from "../types";

const buckets = new Hono<{ Bindings: Env }>();

buckets.get("/", async (c) => {
  const url = new URL(c.req.url);

  if (url.searchParams.has("current")) {
    const driveid = url.hostname.replace(/\..*/, "");
    const bucket: R2Bucket = (c.env as any)[driveid] || c.env.BUCKET;

    if (!(await bucket.head("_$flaredrive$/CNAME"))) {
      await bucket.put("_$flaredrive$/CNAME", url.hostname);
    }

    const client = new S3Client(c.env.AWS_ACCESS_KEY_ID!, c.env.AWS_SECRET_ACCESS_KEY!);
    const resp = await client.s3Fetch(
      `https://${c.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/`
    );
    const text = await resp.text();
    const names = [...text.matchAll(/<Name>([0-9a-z-]*)<\/Name>/g)].map((m) => m[1]);

    const currentBucket = await Promise.any(
      names.map(
        (name) =>
          new Promise<string>((resolve, reject) => {
            client
              .s3Fetch(
                `https://${c.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${name}/_$flaredrive$/CNAME`
              )
              .then((r) => r.text())
              .then((t) => (t === url.hostname ? resolve(name) : reject()))
              .catch(() => reject());
          })
      )
    );

    return c.text(currentBucket, 200, { "cache-control": "max-age=604800" });
  }

  const client = new S3Client(c.env.AWS_ACCESS_KEY_ID!, c.env.AWS_SECRET_ACCESS_KEY!);
  const resp = await client.s3Fetch(
    `https://${c.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/`
  );
  const text = await resp.text();
  return c.text(text);
});

export default buckets;
