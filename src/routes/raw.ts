import { Hono } from "hono";
import { parseBucketPath } from "../utils/bucket";
import type { Env } from "../types";

const raw = new Hono<{ Bindings: Env }>();

raw.get("/*", async (c) => {
  const [bucket, bucketPath] = parseBucketPath(c.req.raw, c.env);
  if (!bucket) return c.text("Not found", 404);

  const pubUrl = c.env.PUBURL + "/" + c.req.url.split("/raw/")[1];

  const response = await fetch(
    new Request(pubUrl, {
      body: c.req.raw.body,
      headers: c.req.raw.headers,
      method: c.req.raw.method,
      redirect: "follow",
    })
  );

  const headers = new Headers(response.headers);
  if (bucketPath.startsWith("_$flaredrive$/thumbnails/")) {
    headers.set("Cache-Control", "max-age=31536000");
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
});

export default raw;
