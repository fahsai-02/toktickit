import { describe, it, expect, vi, afterEach } from "vitest";
import { createTicket, ApiError } from "../../src/api.js";

const input = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: "MEDIUM" as const,
  summary: "Laptop battery drains quickly",
  description: "Battery drains within two hours.",
};

const response = (ok: boolean, status: number, body: unknown) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as unknown as Response;

describe("createTicket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the created ticket on success", async () => {
    const ticket = {
      id: 1,
      ticketNumber: "TKT-2026-000001",
      summary: input.summary,
      description: input.description,
      requestedPriority: "MEDIUM",
      itPriority: null,
      currentStatus: "NEW",
      ticketDate: "2026-08-29T10:00:00.000Z",
      requester: { id: 1, name: "Jennifer Anderson" },
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 7, name: "Corporate Laptop", categoryId: 2 },
      createdAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(true, 201, { data: ticket }))
    );

    await expect(createTicket(input)).resolves.toBe(ticket);
  });

  it("throws ApiError with field errors on validation failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(false, 400, {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            fields: { summary: "Summary is required (1-120 characters)." },
          },
        })
      )
    );

    const err = (await createTicket(input).catch((e) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.fields?.summary).toBe("Summary is required (1-120 characters).");
  });

  it("throws ApiError with INTERNAL_ERROR code when body has no envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(false, 500, {}))
    );

    const err = (await createTicket(input).catch((e) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("INTERNAL_ERROR");
  });
});
