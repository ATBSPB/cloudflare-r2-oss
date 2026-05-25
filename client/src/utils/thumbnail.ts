const THUMBNAIL_SIZE = 144;
const THUMBNAIL_TIMEOUT = 3000;

export function canGenerateThumbnail(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "video/mp4";
}

async function thumbnailFromImage(file: File): Promise<Blob | null> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });

  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

  return new Promise((resolve) => canvas.toBlob(resolve));
}

async function thumbnailFromVideo(file: File): Promise<Blob | null> {
  const video = document.createElement("video");
  video.muted = true;
  video.src = URL.createObjectURL(file);

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Video load timeout")), THUMBNAIL_TIMEOUT)
  );

  await Promise.race([video.play(), timeout]);
  video.pause();
  video.currentTime = 0;

  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

  return new Promise((resolve) => canvas.toBlob(resolve));
}

export async function generateThumbnail(file: File): Promise<Blob | null> {
  if (!canGenerateThumbnail(file)) return null;
  try {
    if (file.type.startsWith("image/")) return await thumbnailFromImage(file);
    if (file.type === "video/mp4") return await thumbnailFromVideo(file);
  } catch {
    // silent
  }
  return null;
}

export async function blobDigest(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-1", buffer);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
