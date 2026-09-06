import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import app from "../../src/app.js";
import { db } from "../../src/db.js";

let ticketId: number;
let ticketId2: number;
let attachmentId: number;

const validTicketBody = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: "MEDIUM",
  summary: "Attachment test ticket",
  description: "Ticket for testing attachments.",
};

const validTicketBody2 = {
  requesterId: 2,
  categoryId: 3,
  relatedSystemId: 4,
  requestedPriority: "HIGH",
  summary: "Attachment test ticket 2",
  description: "Another ticket for attachment testing.",
};

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");

beforeAll(async () => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const pdfPath = path.join(FIXTURES_DIR, "test-file.pdf");
  if (!fs.existsSync(pdfPath)) {
    fs.writeFileSync(pdfPath, "%PDF-1.4 fake pdf content for testing");
  }

  const jpgPath = path.join(FIXTURES_DIR, "test-image.jpg");
  if (!fs.existsSync(jpgPath)) {
    fs.writeFileSync(jpgPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));
  }

  const pngPath = path.join(FIXTURES_DIR, "test-image.png");
  if (!fs.existsSync(pngPath)) {
    fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  const txtPath = path.join(FIXTURES_DIR, "test-file.txt");
  if (!fs.existsSync(txtPath)) {
    fs.writeFileSync(txtPath, "This is a text file for testing rejection.");
  }

  const res1 = await request(app).post("/api/tickets").send(validTicketBody);
  ticketId = res1.body.data.id;

  const res2 = await request(app).post("/api/tickets").send(validTicketBody2);
  ticketId2 = res2.body.data.id;
});

afterAll(async () => {
  await db.attachment.deleteMany({ where: { ticketId: { in: [ticketId, ticketId2] } } });
  await db.ticket.deleteMany({ where: { id: { in: [ticketId, ticketId2] } } });

  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  await db.attachment.deleteMany({ where: { ticketId } });
});

describe("POST /api/tickets/:id/attachments", () => {
  it("API-14: upload valid PDF returns 201 with attachment metadata", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      originalFileName: "test-file.pdf",
      mimeType: "application/pdf",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      uploadedByRequesterId: 1,
    });
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.fileSize).toBeGreaterThan(0);
    expect(res.body.data.createdAt).toBeTruthy();
    attachmentId = res.body.data.id;
  });

  it("API-14: uploaded file appears in ticket detail attachments", async () => {
    await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));

    const res = await request(app)
      .get(`/api/tickets/${ticketId}?requesterId=1`);

    expect(res.status).toBe(200);
    expect(res.body.data.attachments.length).toBeGreaterThanOrEqual(1);
    const names = res.body.data.attachments.map((a: { originalFileName: string }) => a.originalFileName);
    expect(names).toContain("test-file.pdf");
  });

  it("API-14: upload valid JPG returns 201", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-image.jpg"));

    expect(res.status).toBe(201);
    expect(res.body.data.mimeType).toBe("image/jpeg");
  });

  it("API-14: upload valid PNG returns 201", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-image.png"));

    expect(res.status).toBe(201);
    expect(res.body.data.mimeType).toBe("image/png");
  });

  it("API-20: returns 400 when 6th active attachment is uploaded", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .field("requesterId", "1")
        .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));
    }

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it("API-21: returns 413 for oversized file", async () => {
    const bigPath = path.join(FIXTURES_DIR, "big-file.pdf");
    fs.writeFileSync(bigPath, Buffer.alloc(6 * 1024 * 1024, 0x41));

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", bigPath);

    fs.unlinkSync(bigPath);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("API-21: returns 415 for unsupported file type", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-file.txt"));

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 403 when uploading to another requester's ticket", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "2")
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for unknown ticket id", async () => {
    const res = await request(app)
      .post("/api/tickets/99999/attachments")
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 when file is missing", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when requesterId is missing", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/attachments/:id/download", () => {
  let activeAttachmentId: number;

  beforeEach(async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));
    activeAttachmentId = uploadRes.body.data.id;
  });

  it("API-15: returns 200 with binary content for active attachment", async () => {
    const res = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download?requesterId=1`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain('attachment; filename="test-file.pdf"');
    expect(Number(res.headers["content-length"])).toBeGreaterThan(0);
  });

  it("API-16: returns 403 when downloading another requester's attachment", async () => {
    const res = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download?requesterId=2`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-17: returns 410 for removed attachment", async () => {
    await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 1, removalReason: "Wrong file attached" });

    const res = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download?requesterId=1`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("GONE");
  });

  it("returns 404 for unknown attachment id", async () => {
    const res = await request(app)
      .get("/api/attachments/99999/download?requesterId=1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 when requesterId is missing", async () => {
    const res = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/attachments/:id", () => {
  let activeAttachmentId: number;

  beforeEach(async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-file.pdf"));
    activeAttachmentId = uploadRes.body.data.id;
  });

  it("API-18: soft-removes an active attachment with valid reason", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 1, removalReason: "Attached wrong file" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: activeAttachmentId,
      isRemoved: true,
      removalReason: "Attached wrong file",
    });
    expect(res.body.data.removedAt).toBeTruthy();
  });

  it("API-19: removed attachment metadata persists after soft removal", async () => {
    await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 1, removalReason: "Wrong attachment" });

    const detailRes = await request(app)
      .get(`/api/tickets/${ticketId}?requesterId=1`);

    expect(detailRes.status).toBe(200);
    const removed = detailRes.body.data.attachments.find(
      (a: { id: number }) => a.id === activeAttachmentId
    );
    expect(removed).toBeDefined();
    expect(removed.isRemoved).toBe(true);
    expect(removed.removalReason).toBe("Wrong attachment");
    expect(removed.removedAt).toBeTruthy();
  });

  it("API-20: file still exists on disk after soft removal", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", path.join(FIXTURES_DIR, "test-image.jpg"));

    const uploadedId = uploadRes.body.data.id;

    const attachment = await db.attachment.findUnique({
      where: { id: uploadedId },
      select: { storageFileName: true },
    });
    const storageName = attachment!.storageFileName;

    const deleteRes = await request(app)
      .delete(`/api/attachments/${uploadedId}`)
      .send({ requesterId: 1, removalReason: "Test retention" });

    expect(deleteRes.status).toBe(200);

    const filePath = path.join(import.meta.dirname, "..", "..", "uploads", storageName);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("API-21: returns 400 when removing an already removed attachment", async () => {
    await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 1, removalReason: "First removal" });

    const res = await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 1, removalReason: "Second removal attempt" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it("returns 403 when removing another requester's attachment", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 2, removalReason: "Not my attachment" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when removalReason is too short", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 1, removalReason: "ab" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.removalReason).toBeTruthy();
  });

  it("returns 400 when removalReason is missing", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .send({ requesterId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for unknown attachment id", async () => {
    const res = await request(app)
      .delete("/api/attachments/99999")
      .send({ requesterId: 1, removalReason: "Unknown attachment" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
