export interface R2FileInfo {
  key: string;
  size: number;
  uploaded: string;
  httpMetadata: { contentType?: string };
  customMetadata?: { thumbnail?: string };
}

export interface FileListResponse {
  value: R2FileInfo[];
  folders: string[];
}

export type SortMode = "name" | "size-asc" | "size-desc";
