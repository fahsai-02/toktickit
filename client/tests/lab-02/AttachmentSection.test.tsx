import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttachmentSection from "../../src/components/AttachmentSection.js";
import * as api from "../../src/api.js";
import type { Attachment } from "../../src/api.js";

const requesterId = 1;
const ticketId = 10;

const activeAttachment: Attachment = {
  id: 100,
  originalFileName: "report.pdf",
  fileSize: 204800,
  mimeType: "application/pdf",
  isRemoved: false,
  removedAt: null,
  removalReason: null,
  uploadedByRequesterId: 1,
  createdAt: "2026-08-29T10:05:00.000Z",
};

const removedAttachment: Attachment = {
  id: 101,
  originalFileName: "old-photo.png",
  fileSize: 512000,
  mimeType: "image/png",
  isRemoved: true,
  removedAt: "2026-08-29T11:00:00.000Z",
  removalReason: "Attached wrong screenshot",
  uploadedByRequesterId: 1,
  createdAt: "2026-08-29T10:03:00.000Z",
};

function renderSection(attachments: Attachment[] = [], onUpdate?: (a: Attachment[]) => void) {
  return render(
    <AttachmentSection
      ticketId={ticketId}
      requesterId={requesterId}
      attachments={attachments}
      onUpdate={onUpdate ?? vi.fn()}
    />
  );
}

describe("AttachmentSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── UI-15: Uploading state → active → row error + Retry ──────────────
  describe("UI-15: Upload states", () => {
    it("shows uploading spinner during upload", async () => {
      let resolveUpload: (v: Attachment) => void;
      vi.spyOn(api, "uploadAttachment").mockImplementation(
        () => new Promise((r) => { resolveUpload = r; })
      );

      const file = new File(["content"], "test.pdf", { type: "application/pdf" });
      renderSection([], vi.fn());

      const input = screen.getByTestId("attachment-file-input");
      fireEvent.change(input, { target: { files: [file] } });

      expect(await screen.findByTestId("uploading-attachment")).toBeInTheDocument();
      expect(screen.getByText(/Uploading/)).toBeInTheDocument();

      resolveUpload!({ ...activeAttachment, id: 999 });
      await waitFor(() => {
        expect(screen.queryByTestId("uploading-attachment")).not.toBeInTheDocument();
      });
    });

    it("shows error row with Retry button on upload failure", async () => {
      vi.spyOn(api, "uploadAttachment").mockRejectedValue(
        new api.ApiError("File size exceeds the 5 MB limit.", "PAYLOAD_TOO_LARGE")
      );

      const file = new File(["content"], "big.pdf", { type: "application/pdf" });
      renderSection([], vi.fn());

      const input = screen.getByTestId("attachment-file-input");
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("upload-error")).toBeInTheDocument();
      });
      expect(screen.getByText(/File size exceeds/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("retries upload when Retry is clicked", async () => {
      const uploadSpy = vi.spyOn(api, "uploadAttachment");
      uploadSpy.mockRejectedValueOnce(new api.ApiError("Network error", "INTERNAL_ERROR"));
      uploadSpy.mockResolvedValueOnce({ ...activeAttachment, id: 999 });

      const onUpdate = vi.fn();
      const file = new File(["content"], "retry.pdf", { type: "application/pdf" });
      renderSection([], onUpdate);

      const input = screen.getByTestId("attachment-file-input");
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("upload-error")).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
      expect(uploadSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ── UI-16: Removed row presentation ──────────────────────────────────
  describe("UI-16: Removed attachment presentation", () => {
    it("shows removed attachment with muted style and reason caption", () => {
      renderSection([activeAttachment, removedAttachment]);

      const removedRow = screen.getByTestId(`attachment-removed-${removedAttachment.id}`);
      expect(removedRow).toBeInTheDocument();
      expect(removedRow).toHaveClass("attachment-item--removed");
      expect(screen.getByText("old-photo.png")).toBeInTheDocument();
      expect(screen.getByText(/Removed.*Attached wrong screenshot/)).toBeInTheDocument();
    });

    it("Download button is disabled with tooltip on removed attachment", () => {
      renderSection([removedAttachment]);

      const disabledBtn = screen.getByTestId(`download-disabled-btn-${removedAttachment.id}`);
      expect(disabledBtn).toBeDisabled();
      expect(disabledBtn).toHaveAttribute(
        "title",
        "Removed attachments cannot be downloaded"
      );
    });
  });

  // ── UI-17: Remove dialog gating (3–200 chars) ────────────────────────
  describe("UI-17: Remove dialog", () => {
    it("opens remove dialog with reason textarea", () => {
      renderSection([activeAttachment]);

      const removeBtn = screen.getByTestId(`remove-btn-${activeAttachment.id}`);
      fireEvent.click(removeBtn);

      expect(screen.getByTestId("remove-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("remove-reason-input")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
    });

    it("Remove button is disabled when reason is too short", () => {
      renderSection([activeAttachment]);

      fireEvent.click(screen.getByTestId(`remove-btn-${activeAttachment.id}`));

      const confirmBtn = screen.getByTestId("confirm-remove-btn");
      expect(confirmBtn).toBeDisabled();

      fireEvent.change(screen.getByTestId("remove-reason-input"), {
        target: { value: "ab" },
      });
      expect(confirmBtn).toBeDisabled();
    });

    it("Remove button is enabled when reason is 3-200 chars", () => {
      renderSection([activeAttachment]);

      fireEvent.click(screen.getByTestId(`remove-btn-${activeAttachment.id}`));

      fireEvent.change(screen.getByTestId("remove-reason-input"), {
        target: { value: "Valid reason" },
      });
      expect(screen.getByTestId("confirm-remove-btn")).not.toBeDisabled();
    });

    it("closes dialog on Cancel", () => {
      renderSection([activeAttachment]);

      fireEvent.click(screen.getByTestId(`remove-btn-${activeAttachment.id}`));
      expect(screen.getByTestId("remove-dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("cancel-remove-btn"));
      expect(screen.queryByTestId("remove-dialog")).not.toBeInTheDocument();
    });

    it("calls removeAttachment and updates row on success", async () => {
      const updatedAttachment = { ...activeAttachment, isRemoved: true, removedAt: "2026-08-29T12:00:00.000Z", removalReason: "Wrong file" };
      vi.spyOn(api, "removeAttachment").mockResolvedValue(updatedAttachment);

      const onUpdate = vi.fn();
      renderSection([activeAttachment], onUpdate);

      fireEvent.click(screen.getByTestId(`remove-btn-${activeAttachment.id}`));
      fireEvent.change(screen.getByTestId("remove-reason-input"), {
        target: { value: "Wrong file attached" },
      });
      fireEvent.click(screen.getByTestId("confirm-remove-btn"));

      await waitFor(() => {
        expect(api.removeAttachment).toHaveBeenCalledWith(
          activeAttachment.id,
          requesterId,
          "Wrong file attached"
        );
      });
      expect(onUpdate).toHaveBeenCalledWith([updatedAttachment]);
    });

    it("shows error when removal fails", async () => {
      vi.spyOn(api, "removeAttachment").mockRejectedValue(
        new api.ApiError("Already removed", "BUSINESS_RULE_VIOLATION")
      );

      renderSection([activeAttachment]);

      fireEvent.click(screen.getByTestId(`remove-btn-${activeAttachment.id}`));
      fireEvent.change(screen.getByTestId("remove-reason-input"), {
        target: { value: "Try to remove" },
      });
      fireEvent.click(screen.getByTestId("confirm-remove-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("remove-error")).toBeInTheDocument();
      });
    });
  });

  // ── UI-18: Limit reached UX ──────────────────────────────────────────
  describe("UI-18: Attachment limit", () => {
    it("hides Add attachment button and shows hint at 5 active files", () => {
      const fiveActive: Attachment[] = Array.from({ length: 5 }, (_, i) => ({
        ...activeAttachment,
        id: 100 + i,
        originalFileName: `file-${i}.pdf`,
      }));

      renderSection(fiveActive);

      expect(screen.queryByTestId("add-attachment-btn")).not.toBeInTheDocument();
      expect(screen.getByTestId("attachment-limit-hint")).toBeInTheDocument();
      expect(screen.getByText(/Maximum of 5 active attachments reached/)).toBeInTheDocument();
    });

    it("shows Add attachment button when fewer than 5 active files", () => {
      renderSection([activeAttachment]);

      expect(screen.getByTestId("add-attachment-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("attachment-limit-hint")).not.toBeInTheDocument();
    });
  });

  // ── Download with unavailable error + Retry ──────────────────────────
  describe("Download unavailable state", () => {
    it("shows error with Retry button when download fails", async () => {
      vi.spyOn(api, "downloadAttachment").mockRejectedValue(
        new api.ApiError("Attachment file not found on disk.", "NOT_FOUND")
      );

      renderSection([activeAttachment]);

      const downloadBtn = screen.getByTestId(`download-btn-${activeAttachment.id}`);
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(screen.getByText("Attachment file not found on disk.")).toBeInTheDocument();
      });
      expect(screen.getByTestId(`retry-download-btn-${activeAttachment.id}`)).toBeInTheDocument();
    });

    it("clears error and downloads on retry", async () => {
      const downloadSpy = vi.spyOn(api, "downloadAttachment");
      downloadSpy.mockRejectedValueOnce(new api.ApiError("Network error", "INTERNAL_ERROR"));
      downloadSpy.mockResolvedValueOnce(new Blob(["file content"]));

      const { container } = renderSection([activeAttachment]);

      fireEvent.click(screen.getByTestId(`download-btn-${activeAttachment.id}`));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });

      const retryBtn = screen.getByTestId(`retry-download-btn-${activeAttachment.id}`);
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.queryByText("Network error")).not.toBeInTheDocument();
      });
      expect(downloadSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ── Empty state ──────────────────────────────────────────────────────
  describe("Empty state", () => {
    it("shows 'No attachments' when list is empty", () => {
      renderSection([]);
      expect(screen.getByTestId("no-attachments")).toBeInTheDocument();
      expect(screen.getByText("No attachments.")).toBeInTheDocument();
    });
  });
});
