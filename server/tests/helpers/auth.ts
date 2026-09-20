import request from "supertest";
import { expect } from "vitest";
import app from "../../src/app.js";
import type { UserRole } from "../../src/generated/prisma/client.js";
import { SEED_USERS } from "../../src/lib/seedData.js";
import { ROLE_TO_PASSWORD } from "../../src/lib/seedCredentials.js";

// Shared session helper for every Lab 3 API test that needs an authenticated
// `requesterId`-free contract (FR-13, BR-03). Identity always comes from the
// seed modules (single source of truth), never hard-coded.
//
// bcrypt cost is 12 (~450ms/hash), so login performs a real compare. Keep the
// number of logins per suite low and set explicit timeouts where many logins
// happen; reuse one agent across a describe when possible.

export type AuthedAgent = ReturnType<typeof request.agent>;

export function seedUserFor(role: UserRole, index = 0): {
  name: string;
  email: string;
  isActive: boolean;
} {
  const matches = SEED_USERS.filter((u) => u.role === role && u.isActive);
  return matches[index];
}

export async function loginAs(
  email: string,
  password: string
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

/** Authenticated agent for the index-th active seed account of a role. */
export async function authedAgent(
  role: UserRole,
  index = 0
): Promise<ReturnType<typeof request.agent>> {
  const account = seedUserFor(role, index);
  return loginAs(account.email, ROLE_TO_PASSWORD[account.role]);
}