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
| 8 | อ่าน acceptance criteria ของ issue 4 แล้วต้องทำอะไรบ้าง | server: GET /api/categories (Prisma, เรียง id) + Supertest; client: checkSystem fetch + render list + loading/error + Vitest | เอาแผนไปแบ่งเป็น sub-issue 5 ตัว แล้วทำทีละ task |
| 9 | ควรทดสอบ checkSystem/api.ts ยังไง และจะบังคับให้เป็น error state ได้ยังไง | mock global fetch (vi.stubGlobal) ฝั่ง api; mock db module (vi.mock) ให้ findMany reject เพื่อ test 500; UI ใช้ vi.spyOn(api, "checkSystem") | ใช้ vi.spyOn ครอบแค่ UI test ตามที่ lab แนะนำ ไม่ต้องพึ่ง fetch จริง |
| 10 | กด [Check System] แล้วไม่ขึ้น Online ทั้งที่ server ตอบ 200 | server ไม่มี CORS middleware → browser block fetch ข้าม origin 5173→5000 | เพิ่ม app.use(cors()) ใน server และยืนยัน Access-Control-Allow-Origin แล้ว show Online ได้จริง |

## Reflection
การส่งสิ่งที่ต้องการทั้งหมดให้พร้อมให้ AI agent วางแผนมาให้ดูก่อน ทำให้รู้ว่า agent จะทำอะไร
และตรงไหนที่เข้าใจไม่ตรงกัน จะได้แก้ไขได้ทันที จุดที่ต้องแก้ไขตอนตรวจคือการเชื่อมต่อระหว่าง
client กับ server agent ลืมคิดว่าต้องเชื่อมถึงกันยังไง ให้มาแต่โค้ด แต่ไม่ได้ติดตั้ง
dependency เพิ่ม (เช่น cors) ทำให้รันจริงแล้วใช้งานไม่ได้