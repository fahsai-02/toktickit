# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Pass |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Pass |
| 3 | Vitest | Heading renders | Pass |
| 4 | Vitest | Success state shows Online + category list | Pass |
| 5 | Vitest | Error state shows Offline + message | Pass |

Paste your passing terminal output / screenshot below.

**1. GET /api/health returns 200, status=ok**

Terminal output: 
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/server

 ✓ tests/lab-01/health.test.ts > GET /api/health > returns 200 with status ok and service name 21ms

 Test Files  2 passed (2)
      Tests  3 passed (3)
   Start at  22:07:18
   Duration  946ms (transform 119ms, setup 0ms, import 673ms, tests 170ms, environment 0ms)
```

**2. GET /api/categories returns 4 seeded categories in id order**

Terminal output: 
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/server

 ✓ tests/lab-01/health.test.ts > GET /api/health > returns 200 with status ok and service name 21ms
 ✓ tests/lab-01/categories.test.ts > GET /api/categories > returns 200 with the seeded categories in id order 139ms
 ✓ tests/lab-01/categories.test.ts > GET /api/categories > returns each category with only id and name 6ms

 Test Files  2 passed (2)
      Tests  3 passed (3)
   Start at  22:07:18
   Duration  946ms (transform 119ms, setup 0ms, import 673ms, tests 170ms, environment 0ms)
```

**3. Heading renders**

Terminal output: 
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client

 ✓ tests/lab-01/App.test.tsx > App > renders the TokTickIT heading 29ms
 ✓ tests/lab-01/App.test.tsx > App > shows Online when the health check succeeds 83ms
 ✓ tests/lab-01/App.test.tsx > App > shows an Offline error message when the API is unavailable 13ms
 ✓ tests/lab-01/App.test.tsx > App > shows the seeded categories returned by the API on success 12ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  22:07:19
   Duration  1.24s (transform 102ms, setup 119ms, import 158ms, tests 140ms, environment 693ms)
```
**4. Success state shows Online + category list**

Terminal output: 
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client

 ✓ tests/lab-01/App.test.tsx > App > renders the TokTickIT heading 29ms
 ✓ tests/lab-01/App.test.tsx > App > shows Online when the health check succeeds 83ms
 ✓ tests/lab-01/App.test.tsx > App > shows an Offline error message when the API is unavailable 13ms
 ✓ tests/lab-01/App.test.tsx > App > shows the seeded categories returned by the API on success 12ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  22:07:19
   Duration  1.24s (transform 102ms, setup 119ms, import 158ms, tests 140ms, environment 693ms)
```

The success test asserts `System Status: Online`, the "Supported Request Categories" heading, and the four seeded category names (Account and Access, Hardware, Software, Network) — all returned by the mocked `checkSystem()` API rather than hard-coded in the UI.

**5. Error state shows Offline + message**

Terminal output: 
```
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client

 ✓ tests/lab-01/App.test.tsx > App > renders the TokTickIT heading 29ms
 ✓ tests/lab-01/App.test.tsx > App > shows Online when the health check succeeds 83ms
 ✓ tests/lab-01/App.test.tsx > App > shows an Offline error message when the API is unavailable 13ms
 ✓ tests/lab-01/App.test.tsx > App > shows the seeded categories returned by the API on success 12ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  22:07:19
   Duration  1.24s (transform 102ms, setup 119ms, import 158ms, tests 140ms, environment 693ms)
```

The error test mocks `checkSystem()` to reject, then asserts `System Status: Offline` and `Unable to connect to TokTickIT API` are shown.