# Lab 2 — AI Use and Reflection

**LLM/agent used:** opencode coding agent local CLI, opencode/big-pickle as the LLM.

## Selected key prompts (updated incrementally each issue)
| # | Prompt (summarised) | AI Answer | What I did with the result |
|---|---------------------|-----------|----------------------------|
| 1 | ถามคำถาม decision ก่อนร่าง spec (ownership status, requesterId ส่งยังไง, attachment flow, selection เก็บที่ไหน) | เสนอตัวเลือกพร้อมข้อดีข้อเสีย 4 คำถาม | เลือกเองทีละข้อ → กลายเป็น AD-01..AD-04 ใน specification.md |
| 2 | ร่าง specification.md ฉบับเต็ม | FR-01..18, BR-01..22, AC-01..26, data design, API summary, DoD, AD-01..10 | อ่านทีละหมวด แก้หลายรอบ เช่น บังคับ FR-06 เป็น "will filter" ชัด ๆ กับ FR-14 whitelist sort |
| 3 | เขียน api-spec.md 9 endpoint ตาม contract ใน spec | ได้ conventions + error envelope + request/response ครบทุก endpoint | review เจอ contradictions 3 จุด (identity transport ซ้ำ, base URL สั้นไป, query param ชื่อไม่ตรง field) สั่งแก้ทั้งหมด |
| 4 | ตรวจความสอดคล้อง 4 ไฟล์ spec เทียบ labsheet ทั้งฉบับ | เจอ My Tickets ขาดปุ่ม Create Ticket (Section 8.4 บังคับ), section refs ผิด, และ API test "disk file deleted" ที่ขัด BR-09 soft removal | สั่งแก้ครบทุกจุด แล้ว re-check จน clean |
| 5 | ต้องใส่ `!important` แทบทุกบรรทัดใน .css สไตล์ถึงจะชนะ อยากได้วิธีแก้ที่เลิกใช้ `!important` ได้ | AI อธิบายวิธีใช้ CSS Layers (`@layer reset, bootstrap, components, layout`) เพื่อบังคับลำดับความสำคัญแทนการยิง specificity แบบเดิม | refactor `index.css`/`App.css` เป็น layer ตามนั้น แล้วลบ `!important` ออกจนหมด |
| 6 | เปลี่ยนมาใช้ layer แล้วยังเจอปัญหาลำดับความสำคัญทับกัน และโค้ด CSS ซ้ำกันหลายที่ | AI อธิบายว่า `layout` layer ชนะ `components` เสมอ ให้วาง page-specific override ไว้ที่ `App.css` และรวบสไตล์ที่ซ้ำไว้เป็น class/component เดียว | ย้าย override ที่ชนกันไป layer layout และแยกสไตล์ปุ่มเป็น `Button.css` ใช้ร่วมกันแทนการ copy ซ้ำ |
| 7 | ไล่ตรวจโค้ดให้ครบว่าทุกส่วนแยกเป็น component จริงไหม หรือยังมี UI ซ้ำ ๆ ที่ฝังอยู่ตรง ๆ ในหน้า | AI review แล้วชี้จุดที่เขียนซ้ำ/ฝังในหน้า ควรดึงเป็น component re-use ที่ทุกหน้าใช้ร่วมกัน | แยกเป็น `Button`, `SelectField`, `Spinner` ใน `components/` และให้ทุกหน้าดึงมาใช้แทนการเขียนซ้ำ |

*(Living document — appended after each issue; target 6–10 prompts by sprint close per labsheet Part 4.)*

## Reflection
Lab 2 นี้ใช้ AI แบบ Spec-Driven จริง ๆ คือห้ามเขียนโค้ดก่อน ต้องได้ specification ที่ผ่านการ
approve ก่อน ปรากฏว่า AI ช่วยได้เยอะมากในการแปลง labsheet ที่คลุมเครือให้กลายเป็น FR/BR/AC
ที่วัดได้ แต่ก็พลาดเองหลายครั้ง เช่น เขียน API test ที่ขัดกับ business rule ตัวเอง (API-21 vs
BR-09) และออกแบบหน้าจอขาด requirement ที่ labsheet เขียนชัด ๆ (Missing Create Ticket button)
สิ่งที่ได้เรียนคือต้องให้ AI ตรวจไขว้กันหลายไฟล์และตรวจกับ labsheet ต้นทางเสมอ ไม่เชื่อ claim
ว่า "ครบแล้ว" ทุก decision สำคัญผมบังคับให้เป็นคำถาม choice ก่อนเสมอ แล้วบันทึกเป็น AD เพื่อไม่
ให้ AI เดาเองเงียบ ๆ
