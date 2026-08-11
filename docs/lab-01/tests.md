# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | |
| 3 | Vitest | Heading renders | Pass |
| 4 | Vitest | Success state shows Online + category list | |
| 5 | Vitest | Error state shows Offline + message | |

Paste your passing terminal output / screenshot below.

**1. GET /api/health returns 200, status=ok**

Terminal output: 

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
