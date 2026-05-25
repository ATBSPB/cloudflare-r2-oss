import type { FileListResponse, R2FileInfo } from "../types";

const SIZE_LIMIT = 10 * 1000 * 1000;

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
    xhr.open("PUT", `/api/items/${key}`);
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

  const initRes = await fetch(`/api/items/${key}?uploads`, {
    method: "POST",
    headers: { ...hdrs, "content-type": file.type },
  });
  if (!initRes.ok) throw new Error(`Upload init failed: ${initRes.status}`);
  const { uploadId } = await initRes.json() as { uploadId: string };

  const parts: Array<{ partNumber: number; etag: string }> = [];
  for (let i = 1; i <= totalChunks; i++) {
    const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT);
    const params = new URLSearchParams({ partNumber: String(i), uploadId });
    const res = await fetch(`/api/items/${key}?${params}`, {
      method: "PUT",
      headers: hdrs,
      body: chunk,
    });
    if (!res.ok) throw new Error(`Chunk upload failed: ${res.status}`);
    const etag = res.headers.get("etag");
    if (!etag) throw new Error("Missing etag in chunk response");
    parts.push({ partNumber: i, etag });
    onProgress?.(i * SIZE_LIMIT, file.size);
  }

  const completeRes = await fetch(`/api/items/${key}?uploadId=${uploadId}`, {
    method: "POST",
    headers: hdrs,
    body: JSON.stringify({ parts }),
  });
  if (!completeRes.ok) throw new Error(`Multipart complete failed: ${completeRes.status}`);
}

export async function deleteFile(key: string, token: string): Promise<void> {
  await fetch(`/api/items/${key}`, {
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
  await fetch(`/api/items/${newKey}`, {
    method: "PUT",
    headers: { ...headers(token), "x-amz-copy-source": encodeURIComponent(oldKey) },
  });
  await fetch(`/api/items/${oldKey}`, {
    method: "DELETE",
    headers: headers(token),
  });
}

export async function moveFile(
  sourceKey: string,
  targetKey: string,
  token: string
): Promise<void> {
  await fetch(`/api/items/${targetKey}`, {
    method: "PUT",
    headers: { ...headers(token), "x-amz-copy-source": encodeURIComponent(sourceKey) },
  });
  await fetch(`/api/items/${sourceKey}`, {
    method: "DELETE",
    headers: headers(token),
  });
}

export async function createFolder(
  path: string,
  name: string,
  token: string
): Promise<void> {
  await fetch(`/api/items/${path}${name}/_$folder$`, {
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
  await fetch(`/api/items/_$flaredrive$/thumbnails/${digest}.png`, {
    method: "PUT",
    headers: headers(token),
    body: blob,
  });
}
