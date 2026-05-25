export interface Env {
  BUCKET: R2Bucket;
  ASSETS: { fetch: typeof fetch };
  PUBURL: string;
  CF_ACCOUNT_ID?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  TURNSTILE_SECRET?: string;
}

export interface R2FileInfo {
  key: string;
  size: number;
  uploaded: string;
  httpMetadata: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface FileListResponse {
  value: R2FileInfo[];
  folders: string[];
}
