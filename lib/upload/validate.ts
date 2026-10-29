import path from "path";

export function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 4) return false;

  switch (extension) {
    case "pdf":
      // %PDF- (0x25, 0x50, 0x44, 0x46)
      return (
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      );
    case "png":
      // 0x89, 0x50, 0x4E, 0x47
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "jpg":
    case "jpeg":
      // 0xFF, 0xD8, 0xFF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    default:
      return false;
  }
}

export function sanitizeFileName(rawName: string): string {
  const base = path.basename(rawName).trim();
  const sanitized = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
  return sanitized || "document.pdf";
}
