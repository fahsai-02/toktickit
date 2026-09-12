# Lab 3 — Seed Credentials (Local Development Only)

> **Warning:** These credentials exist **only** for local development, testing, and grading.
> Never use these passwords in production, and never commit real personal secrets to this repository.

All passwords are bcrypt-hashed with cost **12** (specification.md §11) and stored in `passwordHash`.
They are never stored in plaintext.

A user holding an **initial password** (`mustChangePassword = true`) is forced to change it at first
login before entering the application (BR-02). A user with `mustChangePassword = false` uses the
documented password directly — it is that account's real password.

## Requester accounts (`TempPass123!`)

Mapped from the Lab 2 legacy `Requester` records (same email). All hold an initial password and must
change it on first login.

| # | Name | Email | Active | Password | mustChangePassword |
|---|------|-------|--------|----------|--------------------|
| 1 | Jennifer Anderson | jennifer.anderson@toktickit.dev | Yes | `TempPass123!` | true |
| 2 | David Lee | david.lee@toktickit.dev | Yes | `TempPass123!` | true |
| 3 | Sarah Johnson | sarah.johnson@toktickit.dev | Yes | `TempPass123!` | true |
| 4 | Michael Brown | michael.brown@toktickit.dev | Yes | `TempPass123!` | true |
| 5 | Napat Chaiwong | napat.chaiwong@toktickit.dev | Yes | `TempPass123!` | true |
| 6 | Robert Brown | robert.brown@toktickit.dev | **No** (inactive) | `TempPass123!` | true |

## IT Staff accounts (`StaffPass1!`)

Kevin holds an initial password so the mandatory first-login flow is testable with a fresh user;
the others log in directly.

| # | Name | Email | Active | Password | mustChangePassword |
|---|------|-------|--------|----------|--------------------|
| 1 | Kevin Smith | itstaff.kevin@toktickit.dev | Yes | `StaffPass1!` | **true** |
| 2 | Sara Patel | itstaff.sara@toktickit.dev | Yes | `StaffPass1!` | false |
| 3 | James Wilson | itstaff.james@toktickit.dev | Yes | `StaffPass1!` | false |
| 4 | Lisa Tan | itstaff.lisa@toktickit.dev | **No** (inactive) | `StaffPass1!` | false |

## Administrator account (`AdminPass1!`)

`mustChangePassword = false` — this account logs straight in with the documented password, so
graders can reach the Admin screens immediately.

| Name | Email | Active | Password | mustChangePassword |
|------|-------|--------|----------|--------------------|
| Administrator | admin@toktickit.dev | Yes | `AdminPass1!` | false |

## Re-running the seed

`pnpm exec prisma db seed` is idempotent. It resets accounts to the table above, so any password the
user changed locally is reset back to these initial values on the next seed run (same behavior as the
Lab 2 `Requester.isActive` re-seed).