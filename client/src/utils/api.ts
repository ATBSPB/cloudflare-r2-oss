import type { FileListResponse, R2FileInfo } from "../types";

const SIZE_LIMIT = 100 * 1000 * 1000;

function headers(token?: string, extra?: Record<string, string>): HeadersInit {
  const h: Record<string, string> = { ...extra };
  if (token) h["cf-turnstile-response"] = token;
  return h;
}

export async function fetchFiles(path: string): Promise<FileListResponse> {
  const res = await fetch(`/api/children/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
}

export async function uploadFile(
  key: string,
  file: File,
  token: string,
  thumbnailDigest?: string | null,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const hdrs: Record<string, string> = { "cf-turnstile-response": token };
  if (thumbnailDigest) hdrs["fd-thumbnail"] = thumbnailDigest;

  if (file.size >= SIZE_LIMIT) {
    await multipartUpload(key, file, hdrs, onProgress);
    return;
  }

  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (e) => onProgress?.(e.loaded, e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText)));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open("PUT", `/api/write/items/${key}`);
    for (const [k, v] of Object.entries(hdrs)) xhr.setRequestHeader(k, v);
    xhr.send(file);
  });
}

async function multipartUpload(
  key: string,
  file: File,
  hdrs: Record<string, string>,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const totalChunks = Math.ceil(file.size / SIZE_LIMIT);

  const initRes = await fetch(`/api/write/items/${key}?uploads`, {
    method: "POST",
    headers: { ...hdrs, "content-type": file.type },
  });
  const { uploadId } = await initRes.json() as { uploadId: string };

  const parts: Array<{ partNumber: number; etag: string }> = [];
  for (let i = 1; i <= totalChunks; i++) {
    const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT);
    const params = new URLSearchParams({ partNumber: String(i), uploadId });
    const res = await fetch(`/api/write/items/${key}?${params}`, {
      method: "PUT",
      headers: hdrs,
      body: chunk,
    });
    parts.push({ partNumber: i, etag: res.headers.get("etag")! });
    onProgress?.(i * SIZE_LIMIT, file.size);
  }

  await fetch(`/api/write/items/${key}?uploadId=${uploadId}`, {
    method: "POST",
    headers: hdrs,
    body: JSON.stringify({ parts }),
  });
}

export async function deleteFile(key: string, token: string): Promise<void> {
  await fetch(`/api/write/items/${key}`, {
    method: "DELETE",
    headers: headers(token),
  });
}

export async function renameFile(
  oldKey: string,
  newName: string,
  cwd: string,
  token: string
): Promise<void> {
  const newKey = `${cwd}${newName}`;
  await fetch(`/api/write/items/${newKey}`, {
    method: "PUT",
    headers: { ...headers(token), "x-amz-copy-source": encodeURIComponent(oldKey) },
  });
  await fetch(`/api/write/items/${oldKey}`, {
    method: "DELETE",
    headers: headers(token),
  });
}

export async function moveFile(
  sourceKey: string,
  targetKey: string,
  token: string
): Promise<void> {
  await fetch(`/api/write/items/${targetKey}`, {
    method: "PUT",
    headers: { ...headers(token), "x-amz-copy-source": encodeURIComponent(sourceKey) },
  });
  await fetch(`/api/write/items/${sourceKey}`, {
    method: "DELETE",
    headers: headers(token),
  });
}

export async function createFolder(
  path: string,
  name: string,
  token: string
): Promise<void> {
  await fetch(`/api/write/items/${path}${name}/_$folder$`, {
    method: "PUT",
    headers: headers(token),
    body: "",
  });
}

export async function uploadThumbnail(
  blob: Blob,
  digest: string,
  token: string
): Promise<void> {
  await fetch(`/api/write/items/_$flaredrive$/thumbnails/${digest}.png`, {
    method: "PUT",
    headers: headers(token),
    body: blob,
  });
}
