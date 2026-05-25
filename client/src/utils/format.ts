export function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN");
}

export function fileNameFromKey(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

export function folderDisplayName(folder: string): string {
  const match = folder.match(/([^/]+)\/?$/);
  return match ? match[1] : folder;
}
