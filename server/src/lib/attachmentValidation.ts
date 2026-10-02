export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

export const MIME_EXT_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

export function validateAttachmentType(
  mimeType: string,
  extension: string
): { valid: boolean; reason?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, reason: `Unsupported MIME type: ${mimeType}` };
  }
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, reason: `Unsupported extension: ${extension}` };
  }
  const allowedExts = MIME_EXT_MAP[mimeType];
  if (!allowedExts || !allowedExts.includes(extension)) {
    return {
      valid: false,
      reason: `MIME type ${mimeType} does not match extension ${extension}`,
    };
  }
  return { valid: true };
}
