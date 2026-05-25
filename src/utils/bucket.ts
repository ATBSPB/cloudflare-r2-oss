import type { Env } from "../types";

export function parseBucketPath(request: Request, env: Env): [R2Bucket, string] {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const routePrefixes = ["/api/children/", "/api/items/", "/raw/"];
  let relativePath = pathname;

  for (const prefix of routePrefixes) {
    if (pathname.startsWith(prefix)) {
      relativePath = pathname.slice(prefix.length);
      break;
    }
  }

  const path = decodeURIComponent(relativePath);
  const driveid = url.hostname.replace(/\..*/, "");
  const bucket: R2Bucket = (env as any)[driveid] || env.BUCKET;

  return [bucket, path];
}
