# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Pass |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | |
| 3 | Vitest | Heading renders | Pass |
| 4 | Vitest | Success state shows Online + category list | Partial — Online asserted (Issue 2); category list pending Issue 4 |
| 5 | Vitest | Error state shows Offline + message | Pass |

Paste your passing terminal output / screenshot below.

**1. GET /api/health returns 200, status=ok**

Terminal output: 
``` 
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/server

stdout | tests/lab-01/health.test.ts
◇ injected env (5) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }

 ✓ tests/lab-01/health.test.ts (1 test) 12ms
   ✓ GET /api/health (1)
     ✓ returns 200 with status ok and service name 11ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:09:39
   Duration  204ms (transform 39ms, setup 0ms, import 107ms, tests 12ms, environment 0ms)
```

**2. GET /api/categories returns 4 seeded categories in id order**

Terminal output: 

**3. Heading renders**

Terminal output: 
```
$ pnpm exec vitest run --reporter=verbose

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client

 ✓ tests/lab-01/App.test.tsx > App > renders the TokTickIT heading 24ms
 ✓ tests/lab-01/App.test.tsx > App > shows Online when the health check succeeds 146ms
 ✓ tests/lab-01/App.test.tsx > App > shows an Offline error message when the API is unavailable 46ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  01:32:25
   Duration  1.07s (transform 44ms, setup 87ms, import 61ms, tests 219ms, environment 561ms)
```
**4. Success state shows Online + category list**

Terminal output: 
```
$ pnpm exec vitest run --reporter=verbose

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client

 ✓ tests/lab-01/App.test.tsx > App > shows Online when the health check succeeds 146ms
 ✓ tests/lab-01/App.test.tsx > App > renders the TokTickIT heading 24ms
 ✓ tests/lab-01/App.test.tsx > App > shows an Offline error message when the API is unavailable 46ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  01:32:25
   Duration  1.07s (transform 44ms, setup 87ms, import 61ms, tests 219ms, environment 561ms)
```

Note: "Online" is asserted via a real `checkSystem()` fetch (mocked in Vitest) as required by Issue 2. The seeded category list is NOT asserted yet — categories are still hardcoded to `[]` in `api.ts` and not rendered in `App.tsx`; this is completed and asserted in Issue 4.

**5. Error state shows Offline + message**

Terminal output: 
```
$ pnpm exec vitest run --reporter=verbose

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client

 ✓ tests/lab-01/App.test.tsx > App > shows an Offline error message when the API is unavailable 46ms
 ✓ tests/lab-01/App.test.tsx > App > renders the TokTickIT heading 24ms
 ✓ tests/lab-01/App.test.tsx > App > shows Online when the health check succeeds 146ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  01:32:25
   Duration  1.07s (transform 44ms, setup 87ms, import 61ms, tests 219ms, environment 561ms)
``` 
