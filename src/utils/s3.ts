function arrayBufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSHA256(secret: ArrayBuffer, message: string | ArrayBuffer): Promise<ArrayBuffer> {
  const data: ArrayBuffer = typeof message === "string"
    ? new TextEncoder().encode(message).buffer as ArrayBuffer
    : message;
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, data);
}

export class S3Client {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region?: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region || "auto";
  }

  async s3Fetch(input: string, init?: RequestInit): Promise<Response> {
    init = init || {};
    const url = new URL(input);
    const objectKey = decodeURI(url.pathname);
    const method = init.method || "GET";
    const canonicalQueryString = [...url.searchParams]
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const hashedPayload = "UNSIGNED-PAYLOAD";
    const headers = new Headers(init.headers);
    const datetime = new Date().toISOString().replace(/[-:]|\.\d+/g, "");

    headers.set("x-amz-date", datetime);
    headers.set("x-amz-content-sha256", hashedPayload);
    headers.set("host", url.host);

    const signedHeaderKeys = [...headers.keys()].filter(
      (h) => h === "host" || h === "content-type" || h.startsWith("x-amz-")
    );
    const canonicalHeaders = signedHeaderKeys
      .map((k) => `${k}:${headers.get(k)}\n`)
      .join("");
    const signedHeaders = signedHeaderKeys.join(";");
    const canonicalUri = encodeURIComponent(objectKey)
      .replaceAll("%2F", "/")
      .replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      hashedPayload,
    ].join("\n");

    const hashedRequest = arrayBufferToHex(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest))
    );
    const scope = `${datetime.slice(0, 8)}/${this.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", datetime, scope, hashedRequest].join("\n");

    const dateKey = await hmacSHA256(
      new TextEncoder().encode("AWS4" + this.secretAccessKey).buffer as ArrayBuffer,
      datetime.slice(0, 8)
    );
    const dateRegionKey = await hmacSHA256(dateKey, this.region);
    const dateRegionServiceKey = await hmacSHA256(dateRegionKey, "s3");
    const signingKey = await hmacSHA256(dateRegionServiceKey, "aws4_request");
    const signature = arrayBufferToHex(await hmacSHA256(signingKey, stringToSign));

    const credential = `${this.accessKeyId}/${scope}`;
    headers.set(
      "Authorization",
      `AWS4-HMAC-SHA256 Credential=${credential},SignedHeaders=${signedHeaders},Signature=${signature}`
    );

    init.headers = headers;
    return fetch(input, init);
  }
}
