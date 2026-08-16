# Lab 1 - Test Plan and Evidence

Lab 1 tests prove the initial TokTickIT vertical slice works correctly:
**React UI → Express REST API → Prisma ORM → PostgreSQL**.

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.
The outputs below show the full suite passing.

| ID | Test | Test File | Tool | Test Description |
|----|------|-----------|------|------------------|
| API-01 | Health check | `tests/lab-01/health.test.ts` | Supertest | Health endpoint returns 200 and expected JSON |
| API-02 | Categories | `tests/lab-01/categories.test.ts` | Supertest | Categories endpoint returns the four seeded categories |
| UI-01 | Heading render | `tests/lab-01/App.test.tsx` | Vitest | TokTickIT heading renders |
| UI-02 | Loading state | `tests/lab-01/App.test.tsx` | Vitest | Loading state changes to category list |
| UI-03 | Error handling | `tests/lab-01/App.test.tsx` | Vitest | API failure displays a useful error message |

## API-01: Health check

Sends `GET /api/health` and asserts the endpoint returns HTTP 200 with the exact
response shape `{ "status": "ok", "service": "TokTickIT API" }`, proving the
Express backend is up and the route is wired correctly.

Terminal output:
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/server


 Test Files  2 passed (2)
      Tests  3 passed (3)
   Start at  19:20:08
   Duration  433ms (transform 76ms, setup 0ms, import 376ms, tests 161ms, environment 1ms)
```

## API-02: Categories

Calls `GET /api/categories` and asserts the endpoint returns the four seeded
categories (Account and Access, Hardware, Software, Network) in id order, each
with only `id` and `name` proving the Prisma ORM reads the seeded PostgreSQL data.

Terminal output:
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/server


 Test Files  2 passed (2)
      Tests  3 passed (3)
   Start at  19:20:08
   Duration  433ms (transform 76ms, setup 0ms, import 376ms, tests 161ms, environment 1ms)
```

## UI-01: Heading render

Renders `<App />` and asserts the "TokTickIT" heading appears, proving the React
component mounts without errors.

Terminal output:
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  19:20:08
   Duration  805ms (transform 34ms, setup 83ms, import 55ms, tests 128ms, environment 434ms)
```

## UI-02: Loading state

The loading test mocks `checkSystem()` to stay pending, clicks the Check System
button, and asserts the button becomes disabled with "Loading…" while
"Checking system…" is shown. It then resolves the mock and confirms the loading
state transitions to the category list.

Terminal output:
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  19:20:08
   Duration  805ms (transform 34ms, setup 83ms, import 55ms, tests 128ms, environment 434ms)
```

## UI-03: Error handling

The error test mocks `checkSystem()` to reject, clicks Check System, and asserts
the UI shows "System Status: Offline" and "Unable to connect to TokTickIT API",
proving API failures surface a useful message to the user.

Terminal output:
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  19:20:08
   Duration  805ms (transform 34ms, setup 83ms, import 55ms, tests 128ms, environment 434ms)
```