# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Pass |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | |
| 3 | Vitest | Heading renders | Pass |
| 4 | Vitest | Success state shows Online + category list | |
| 5 | Vitest | Error state shows Offline + message | |

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
$ vitest run

 RUN  v4.1.10 /home/fahsai/Documents/kmutt/cpe-2569-1/cpe334-SE/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests | 2 todo) 23ms
   ✓ App (3)
     ✓ renders the TokTickIT heading 21ms
     □ shows Online and the seeded categories on success
     □ shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  1 passed | 2 todo (3)
   Start at  12:53:21
   Duration  738ms (transform 65ms, setup 90ms, import 93ms, tests 23ms, environment 442ms)
```
**4. Success state shows Online + category list**

Terminal output: 

**5. Error state shows Offline + message**

Terminal output: 
