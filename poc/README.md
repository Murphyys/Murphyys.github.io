# poc/ — Three.js journey globe (proof of concept)

ลูกโลกจุดสีทองเหลือง ปักหมุด Bangkok · Kushiro · Tokyo มีเส้นโค้งจากกรุงเทพไปที่ฝึกงานในญี่ปุ่นทั้งสองที่ กดหมุดแล้วขึ้นการ์ดรายการ event จาก `journey.json`
ไฟล์เดียวคือ `3d.html` ไม่ได้ลิงก์จากหน้าเว็บจริง

## Status

📦 **เก็บไว้เป็น POC เท่านั้น ไม่เอาขึ้นหน้าแรก** (ไอซ์ตัดสินใจ 2026-10-15) — ทำงานได้และเข้ากับธีม แต่ไม่จำเป็นสำหรับ portfolio:
มีแค่ 3 หมุดกองอยู่เอเชียตะวันออก เล่าเรื่องได้ไม่มากกว่า timeline ที่มีอยู่แล้ว แต่ต้องโหลดเพิ่ม ~195 KB
branch นี้ไม่ได้ push และไม่ได้ merge เข้า `main`

## Run

```bash
python -m http.server 8000
```

แล้วเปิด http://localhost:8000/poc/3d.html · `?nowebgl=1` = ดูหน้า fallback · `?fps=1` = log FPS ลง console

## Cost

| ไฟล์ (jsDelivr, pinned) | brotli |
|---|---|
| `three@0.170.0/build/three.module.min.js` | 171 KB |
| `world-atlas@2.0.2/land-110m.json` | 21 KB |
| `topojson-client@3.1.0/+esm` | 3 KB |
| `3d.html` เอง | 18 KB (ไม่บีบอัด) |

ในพรีวิว desktop ได้ 143 fps (ติดเพดานรีเฟรชเรตจอ — ไม่ใช่ GPU มือถือจริง) · ~7,700 จุดบนแผ่นดิน

## Lessons

- **ไม่ต้องใช้ OrbitControls** — เขียนลากแนวนอนเองไม่กี่บรรทัด + `touch-action: pan-y` บน canvas ⇒ บนมือถือยังเลื่อนหน้าขึ้นลงได้ปกติ, ไม่มี wheel-zoom ดักการ scroll และไม่ต้องโหลด addons
- **`MeshLambertMaterial` หารด้วย π** — ambient 1.0 ทำให้ทะเลสีเทาหม่น ต้องใช้ ambient ~2.5 + directional ~1.1 สีถึงจะใกล้ `--surface` ในโหมดสว่าง
- **จุดแผ่นดินแบบไม่ต้องมี texture:** วาด polygon จาก topojson ลง canvas แบบ equirectangular (1024×512) → ไล่จุดตาม Fibonacci lattice (26k จุด, ไม่กองที่ขั้วโลก) → เก็บเฉพาะจุดที่ตกบนแผ่นดิน → `THREE.Points` ใส่ sprite วงกลม + `alphaTest` · ที่ความละเอียด 110m ฮอกไกโดยังอยู่
- **ป้ายชื่อเป็น HTML `<button>` วางทับ แทนการ raycast** — กดง่ายบนจอสัมผัส, ใช้คีย์บอร์ดได้, ตัวอักษรคม · `project()` ทุกเฟรม, ซ่อนเมื่อหมุดอยู่ใกล้ขอบโลก (dot กับทิศกล้อง < 0.45) และสลับข้างเมื่อจะล้นขอบจอ (Bangkok บนจอ 375px)
- **หมุดกองอยู่มุมเดียวของโลก ⇒ ห้ามหมุนรอบตัวเต็มรอบ** ไม่งั้นส่วนใหญ่จะเห็นแต่มหาสมุทรแอตแลนติก ใช้แกว่งช้า ๆ รอบเอเชีย และกลับมาเองหลังปล่อยมือ 4 วินาที
- **Fallback ต้องแสดงเป็นค่าเริ่มต้น** แล้วให้ module ซ่อนเองตอนสำเร็จ (`.has-gl`) — ครอบคลุมทั้งเครื่องที่ไม่มี WebGL และกรณี CDN/import พังจน module ไม่ได้รันเลย
- **ประหยัดพลังงาน:** หยุด render เมื่อ canvas ไม่อยู่บนจอ (IntersectionObserver) หรือแท็บถูกซ่อน · DPR ไม่เกิน 2 · `prefers-reduced-motion` = ไม่มีแอนิเมชัน render เฉพาะตอนมี input
- **อ่านค่า FPS ใน browser pane ระวัง:** ตอน pane ถูกซ่อน rAF โดน throttle เหลือ ~1 fps ทำให้ดูเหมือนช้า ต้องวัดตอน pane แสดงอยู่
- สีทั้งหมดอ่านจาก CSS token (`getComputedStyle`) แล้วทาใหม่เมื่อสลับธีม ⇒ ใช้ palette เดียวกับเว็บจริงทั้ง light/dark ได้โดยไม่ต้องกำหนดสีซ้ำ

## If revisited

ถ้าวันหนึ่งมีสถานที่มากขึ้นจนคุ้ม: ใส่ `geo` ต่อ event (หรือ list `places`) ใน `journey.json` แทนพิกัดที่ hard-code ไว้ · lazy-load module เมื่อ section ใกล้เข้าจอ · reduced-motion ยังตรวจแค่จากโค้ด ต้องลองบนเครื่องจริง
