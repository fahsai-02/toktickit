import { defineConfig } from "vitest/config";

// Server test configuration.
//
// IMPORTANT: `fileParallelism: false` runs test FILES one at a time (inside one
// worker) instead of in parallel. This is required by tests/lab-03/
// migration-regression.api.test.ts (MIG-01): that suite makes global assertions
// over the shared local PostgreSQL (row-count floors, `requesterUserId IS NULL`
// counts, FK integrity). If other API test files were allowed to create/delete
// tickets concurrently, MIG-01 could observe their in-flight rows and fail
// non-deterministically for reasons unrelated to the migration.
//
// The suite is small (14 files / ~170 tests) so the serialization cost is
// negligible and the assertions become deterministic.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});