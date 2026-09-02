import { describe, it, expect } from "vitest";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function validateAttachmentType(
  mimeType: string,
  extension: string
): { valid: boolean; reason?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, reason: `Unsupported MIME type: ${mimeType}` };
  }
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, reason: `Unsupported extension: ${extension}` };
  }
  if (
    (mimeType === "image/jpeg" && ![".jpg", ".jpeg"].includes(extension)) ||
    (mimeType === "image/png" && extension !== ".png") ||
    (mimeType === "image/webp" && extension !== ".webp") ||
    (mimeType === "application/pdf" && extension !== ".pdf")
  ) {
    return {
      valid: false,
      reason: `MIME type ${mimeType} does not match extension ${extension}`,
    };
  }
  return { valid: true };
}

describe("UNIT-02: Attachment MIME/ext validator", () => {
  describe("allowed types accepted", () => {
    it("accepts JPEG with .jpg extension", () => {
      expect(validateAttachmentType("image/jpeg", ".jpg")).toEqual({ valid: true });
    });

    it("accepts JPEG with .jpeg extension", () => {
      expect(validateAttachmentType("image/jpeg", ".jpeg")).toEqual({ valid: true });
    });

    it("accepts PNG with .png extension", () => {
      expect(validateAttachmentType("image/png", ".png")).toEqual({ valid: true });
    });

    it("accepts WEBP with .webp extension", () => {
      expect(validateAttachmentType("image/webp", ".webp")).toEqual({ valid: true });
    });

    it("accepts PDF with .pdf extension", () => {
      expect(validateAttachmentType("application/pdf", ".pdf")).toEqual({ valid: true });
    });
  });

  describe("disallowed MIME types rejected", () => {
    it("rejects text/plain", () => {
      const result = validateAttachmentType("text/plain", ".txt");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsupported MIME type");
    });

    it("rejects image/gif", () => {
      const result = validateAttachmentType("image/gif", ".gif");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsupported MIME type");
    });

    it("rejects application/zip", () => {
      const result = validateAttachmentType("application/zip", ".zip");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsupported MIME type");
    });

    it("rejects video/mp4", () => {
      const result = validateAttachmentType("video/mp4", ".mp4");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsupported MIME type");
    });
  });

  describe("disallowed extensions rejected", () => {
    it("rejects .txt extension", () => {
      const result = validateAttachmentType("application/pdf", ".txt");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsupported extension");
    });

    it("rejects .gif extension", () => {
      const result = validateAttachmentType("application/pdf", ".gif");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsupported extension");
    });

    it("rejects .docx extension", () => {
      const result = validateAttachmentType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".docx"
      );
      expect(result.valid).toBe(false);
    });

    it("rejects .exe extension", () => {
      const result = validateAttachmentType("application/octet-stream", ".exe");
      expect(result.valid).toBe(false);
    });
  });

  describe("MIME/extension mismatch rejected", () => {
    it("rejects JPEG MIME with .png extension", () => {
      const result = validateAttachmentType("image/jpeg", ".png");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("does not match");
    });

    it("rejects PDF MIME with .jpg extension", () => {
      const result = validateAttachmentType("application/pdf", ".jpg");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("does not match");
    });

    it("rejects PNG MIME with .pdf extension", () => {
      const result = validateAttachmentType("image/png", ".pdf");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("does not match");
    });
  });

  describe("boundary cases", () => {
    it("rejects empty MIME type", () => {
      const result = validateAttachmentType("", ".pdf");
      expect(result.valid).toBe(false);
    });

    it("rejects empty extension", () => {
      const result = validateAttachmentType("application/pdf", "");
      expect(result.valid).toBe(false);
    });

    it("rejects case-sensitive MIME (image/JPEG uppercase)", () => {
      const result = validateAttachmentType("image/JPEG", ".jpg");
      expect(result.valid).toBe(false);
    });
  });
});
