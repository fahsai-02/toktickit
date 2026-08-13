# Lab 1 — AI Use and Reflection

**LLM/agent used:** opencode

## Selected key prompts (6–10)
| # | Prompt (summarised) | AI Answer | What I did with the result |
|---|---------------------|-----------|----------------------------|
| 1 | จาก PR ที่เพื่อน comment ของ issue 1 ตอนนี้ทำอะไรไปแล้วบ้างและขาดอะไร | ขาด server/tests/lab-01/ + docs/ ยังไม่ commit + ตรวจ lockfile | เช็คว่าขาดจริงไหม และให้ ai เขียนไฟล์ app.test.ts และอธิบายให้ |
| 2 | ไฟล์ .js/.d.ts/.map ที่ขึ้นมาเกิดอะไร จำเป็นไหม | เป็น build output จาก tsc ที่เผลอเขียนแทรกเคียงข้างไฟล์ .ts ต้นฉบับ | อ่านคำตอบ และสั่งให้ลบที่สร้างเกินมาให้ |
| 3 | วางแผน issue 2 ว่าต้องทำอะไรบ้าง | ต้องเพิ่ม GET /api/health ใน app.ts + เขียน test + อัปเดต tests.md | เอาแผนไปทำตามลำดับ และเพิ่ม route + test จริง |
| 4 | แบ่ง subtask ของ issue 2 แล้ว commit ทีละอัน ควรแบ่งยังไง | แบ่งเป็น feat(route) → test → docs แยก commit ตามชั้น | ใช้เป็น checklist ทำงานทีละชั้นและ commit แยกไฟล์ |
| 5 | ไฟล์ injected env จาก .env ใน output vitest คืออะไร ปกติไหม | เป็น feature ของ Vitest v4 ที่โหลด .env อัตโนมัติ ไม่ใช่ error | ปล่อยไว้เฉยๆ ไม่ต้องแก้ไข |
| 6 | ควรลบ app.test.ts ไหม และข้อดีข้อเสีย | เก็บไว้ได้เพราะตรวจ unknown route แต่ไม่อยู่ในแผน lab → ลบได้ | ตัดสินใจลบตามข้อเสนอ เพราะ health.test.ts ครอบคลุมแล้ว |
| 7 | รัน seed แล้ว error "driver adapter is required" คืออะไร | Prisma 7 ต้องใช้ driver adapter (PrismaPg) ต่อ DB | ติดตั้ง @prisma/adapter-pg และใส่ adapter ใน PrismaClient |

## Reflection
Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.
