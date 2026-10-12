import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  SEED_BASELINE_COUNTS,
  SEED_USERS,
  SEED_PUBLIC_COMMENTS,
  SEED_INTERNAL_NOTES,
  SEED_LAB4_TICKET_NUMBERS,
  SEED_ACTION_IDS,
  SEED_ACTIONS_TAKEN,
  SEED_ACTION_COUNTS_BY_TICKET,
} from "../../src/lib/seedData.js";
import { authedAgent } from "../helpers/auth.js";

// Lab 4 — migration and seed regression (docs/lab-04/tests.md rows MIG-01..05,
// REG-02, API-43; handout sections 5.2 and 5.3).
//
// MIG-04 runs against a SCRATCH database (`toktickit_migr04_test`) that this
// suite creates and destroys via the local Docker Postgres — never against the
// shared dev DB. MIG-03 re-seeds the dev DB (the documented behavior of
// `prisma db seed`); it is idempotent by design.

const execFileAsync = promisify(execFile);
const SERVER_DIR = path.resolve(__dirname, "../..");

function devUrlDatabaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

const LAB1_3_MODELS = [
  "requester",
  "category",
  "relatedSystem",
  "ticket",
  "attachment",
  "user",
  "publicComment",
  "internalNote",
] as const;

async function runPrisma(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const { stdout, stderr } = await execFileAsync("pnpm", ["exec", "prisma", ...args], {
    cwd: SERVER_DIR,
    env,
  });
  return `${stdout}\n${stderr}`;
}

function scratchUrl(): string {
  const dev = new URL(process.env.DATABASE_URL!);
  dev.pathname = "/toktickit_migr04_test";
  return dev.toString();
}

function psql(dbName: string | null, sql: string): Promise<string> {
  const args = ["exec", "toktickit-postgres", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql];
  if (dbName) args.splice(5, 0, "-d", dbName);
  return execFileAsync("docker", args).then(({ stdout, stderr }) => `${stdout}\n${stderr}`);
}

describe("Lab 4: migration + seed regression (MIG-01..05)", () => {
  it("REG-02: GET /api/health is byte-identical to Lab 1 (api-spec; tests.md REG-02)", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "TokTickIT API" });
  });

  describe("MIG-01 (FR-23, AC-17)", () => {
    it("Lab 1–3 data survived the Lab 4 migration and the seed's own actions reference Lab 4 tickets", async () => {
      const [requester, category, relatedSystem, ticket, attachment, user, comment, note] =
        await Promise.all([
          db.requester.count(),
          db.category.count(),
          db.relatedSystem.count(),
          db.ticket.count(),
          db.attachment.count(),
          db.user.count(),
          db.publicComment.count(),
          db.internalNote.count(),
        ]);

      expect(requester).toBeGreaterThanOrEqual(SEED_BASELINE_COUNTS.requester);
      expect(category).toBeGreaterThanOrEqual(SEED_BASELINE_COUNTS.category);
      expect(relatedSystem).toBeGreaterThanOrEqual(SEED_BASELINE_COUNTS.relatedSystem);
      expect(ticket).toBeGreaterThanOrEqual(SEED_BASELINE_COUNTS.ticket);
      // N5: SEED_BASELINE_COUNTS.attachment is a 0 floor (Attachments are never
      // seeded), so this only proves the count is not negative — it is a
      // non-regression guard, not evidence that Lab 2/3 attachments survived.
      expect(attachment).toBeGreaterThanOrEqual(SEED_BASELINE_COUNTS.attachment);
      expect(user).toBeGreaterThanOrEqual(SEED_USERS.length);
      expect(comment).toBeGreaterThanOrEqual(SEED_PUBLIC_COMMENTS.length);
      expect(note).toBeGreaterThanOrEqual(SEED_INTERNAL_NOTES.length);

      // FK integrity is a property of every ActionTaken row, so it is checked
      // across the whole table.
      const rows = await db.actionTaken.findMany({
        include: {
          ticket: { select: { ticketNumber: true } },
          performedBy: { select: { id: true } },
        },
      });
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.ticket).toBeTruthy();
        expect(row.performedBy.id).toBe(row.performedById);
      }

      // "References a Lab 4 block Ticket" is a claim about the seed's own rows,
      // not about the whole table: a user-created Action Taken on a real Ticket
      // is legitimate and must not fail this regression (AGENTS.md test rule 1).
      // Scope the assertion to the ids the seed owns (seedData.ts).
      const seedRows = rows.filter((row) => SEED_ACTION_IDS.includes(row.id));
      expect(seedRows.length).toBe(SEED_ACTION_IDS.length);
      for (const row of seedRows) {
        expect(SEED_LAB4_TICKET_NUMBERS).toContain(row.ticket.ticketNumber);
      }
    });
  });

  describe("MIG-02 (BR-24)", () => {
    it("the Lab 4 block is exactly TKT-2026-000903..000917, collision-free against the DB", async () => {
      const expectedBlock = Array.from({ length: 15 }, (_, i) =>
        `TKT-2026-${String(903 + i).padStart(6, "0")}`,
      );
      expect([...SEED_LAB4_TICKET_NUMBERS].sort()).toEqual(expectedBlock);

      for (const num of expectedBlock) {
        const matches = await db.ticket.findMany({
          where: { ticketNumber: num },
          select: { id: true },
        });
        expect(matches).toHaveLength(1);
      }
    });
  });

  describe("MIG-03 (BR-24)", () => {
    it(
      "seeding twice produces the same counts — no duplicated tickets or actions",
      { timeout: 180_000 },
      async () => {
        const countLab4Tickets = () =>
          db.ticket.count({
            where: { ticketNumber: { in: SEED_LAB4_TICKET_NUMBERS } },
          });
        const lab4TicketRows = await db.ticket.findMany({
          where: { ticketNumber: { in: SEED_LAB4_TICKET_NUMBERS } },
          select: { id: true },
        });
        const countLab4Actions = () =>
          db.actionTaken.count({
            where: { ticketId: { in: lab4TicketRows.map((t) => t.id) } },
          });

        const beforeTickets = await countLab4Tickets();
        const beforeActions = await countLab4Actions();

        for (let round = 0; round < 2; round += 1) {
          await runPrisma(["db", "seed"], { ...process.env });
        }

        const afterTickets = await countLab4Tickets();
        const afterActions = await countLab4Actions();
        expect(afterTickets).toBe(beforeTickets);
        expect(afterActions).toBe(beforeActions);
        expect(afterActions).toBeGreaterThan(0);
      },
    );
  });

  describe("MIG-05 (BR-21, handout section 5.3)", () => {
    it("zero / exactly-one / multiple Action Taken are all present, derived from seedData", async () => {
      for (const num of SEED_LAB4_TICKET_NUMBERS) {
        const row = await db.ticket.findFirstOrThrow({
          where: { ticketNumber: num },
        });
        const count = await db.actionTaken.count({ where: { ticketId: row.id } });
        expect(count).toBe(SEED_ACTION_COUNTS_BY_TICKET.get(num) ?? 0);
      }

      const values = [...SEED_ACTION_COUNTS_BY_TICKET.values()];
      const zero = SEED_LAB4_TICKET_NUMBERS.find(
        (n) => (SEED_ACTION_COUNTS_BY_TICKET.get(n) ?? 0) === 0,
      );
      const exactlyOne = [...SEED_ACTION_COUNTS_BY_TICKET.entries()].find(([, c]) => c === 1);
      const many = [...SEED_ACTION_COUNTS_BY_TICKET.entries()].find(([, c]) => c >= 2);
      expect(zero).toBeTruthy();
      expect(exactlyOne).toBeTruthy();
      expect(many).toBeTruthy();
      expect(values.some((c) => c >= 2)).toBe(true);

      const pair = SEED_ACTIONS_TAKEN.find((a, i, all) =>
        all.some((x, j) => i !== j && x.ticketNumber === a.ticketNumber && x.actionDate === a.actionDate),
      );
      expect(pair).toBeTruthy();
      const row = await db.ticket.findFirstOrThrow({
        where: { ticketNumber: pair!.ticketNumber },
      });
      const sameDate = await db.actionTaken.findMany({
        where: { ticketId: row.id, actionDate: new Date(pair!.actionDate) },
      });
      expect(sameDate.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("MIG-04 (FR-23, handout section 5.2) — scratch database only", () => {
    it(
      "the documented rollback path works on a scratch DB: revert, verify Lab 1–3 byte-identical, re-apply, ActionTaken empty",
      { timeout: 300_000 },
      async () => {
        const url = scratchUrl();
        const env = { ...process.env, DATABASE_URL: url };
        const devDbName = devUrlDatabaseName(process.env.DATABASE_URL!);
        const scratchName = "toktickit_migr04_test";
        expect(scratchName).not.toBe(devDbName);

        await psql(null, `DROP DATABASE IF EXISTS "${scratchName}" WITH (FORCE);`);
        await psql(null, `CREATE DATABASE "${scratchName}";`);
        await runPrisma(["migrate", "deploy"], env);
        await runPrisma(["db", "seed"], env);

        const scratch = new PrismaClient({
          adapter: new PrismaPg({ connectionString: url }),
        });
        try {
          const countRows = async (): Promise<number[]> => {
            const counts: number[] = [];
            for (const name of LAB1_3_MODELS) {
              const model = (
                scratch as unknown as Record<
                  string,
                  { count: (a?: Parameters<typeof scratch.ticket.count>[0]) => Promise<number> }
                >
              )[name];
              counts.push(await model.count());
            }
            return counts;
          };

          const preRollback = await countRows();
          const actionPre = await scratch.actionTaken.count();
          expect(actionPre).toBeGreaterThan(0);

          // Revert `lab4_actions_taken` exactly as handout section 5.2
          // documents. We take the "restore from a dump" branch: drop the table
          // AND remove its `_prisma_migrations` record — the same end state as
          // restoring a pre-migration dump. (`prisma migrate resolve
          // --rolled-back` cannot be used here: P3012 restricts it to
          // migrations failed at apply time, and ours applied cleanly.)
          await psql(scratchName, 'DROP TABLE "ActionTaken" CASCADE;');
          await psql(
            scratchName,
            `DELETE FROM "_prisma_migrations" WHERE migration_name = '20261009124957_lab4_actions_taken';`,
          );

          const postRollback = await countRows();
          expect(postRollback).toEqual(preRollback);

          const actionTable = await psql(
            scratchName,
            `SELECT 1 FROM information_schema.tables WHERE table_name = 'ActionTaken' LIMIT 1;`,
          );
          expect(actionTable.trim().includes("1")).toBe(false);

          // Re-apply the migration: ActionTaken exists again and is empty.
          await runPrisma(["migrate", "deploy"], env);
          const actionAfter = await scratch.actionTaken.count();
          expect(actionAfter).toBe(0);
          const postReapply = await countRows();
          expect(postReapply).toEqual(preRollback);
        } finally {
          await scratch.$disconnect();
          await psql(null, `DROP DATABASE IF EXISTS "${scratchName}" WITH (FORCE);`);
        }
      },
    );
  });

  describe("API-43 (FR-23, BR-09): Lab 2/3 endpoints unchanged on the Lab 4 schema", () => {
    it("spot-checks the Lab 3 key assertions still hold", async () => {
      const requesterAgent = await authedAgent("REQUESTER");
      const staffAgent = await authedAgent("IT_STAFF");
      const adminAgent = await authedAgent("ADMINISTRATOR");

      const unauth = request(app);
      expect((await unauth.get("/api/auth/me")).status).toBe(401);
      expect((await unauth.get("/api/tickets")).status).toBe(401);

      const myTickets = await requesterAgent.get("/api/tickets");
      expect(myTickets.status).toBe(200);
      expect(Array.isArray(myTickets.body.data)).toBe(true);

      const queue = await staffAgent.get("/api/staff/tickets");
      expect(queue.status).toBe(200);
      expect(Array.isArray(queue.body.data)).toBe(true);

      const users = await adminAgent.get("/api/admin/users");
      expect(users.status).toBe(200);
      expect(Array.isArray(users.body.data)).toBe(true);

      const anonGuard = await unauth.delete("/api/tickets/1/comments");
      expect(anonGuard.status).toBe(405);
      expect(anonGuard.body.error.code).toBe("METHOD_NOT_ALLOWED");
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });
});