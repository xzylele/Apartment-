# Home Apartment Manager

ระบบบริหารอพาร์ตเมนต์ภาษาไทยสำหรับห้องพักประมาณ 40 ห้อง สร้างด้วย Next.js และ Supabase

## เริ่มต้นใช้งาน

1. คัดลอก `.env.example` เป็น `.env.local`
2. กำหนด `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` จากหน้า Supabase Project Settings
3. กำหนด `SUPABASE_SERVICE_ROLE_KEY` เฉพาะกรณี Route Handler ฝั่งเซิร์ฟเวอร์ที่จำเป็นต้องใช้สิทธิ์ผู้ดูแล ห้ามนำไปใช้ใน browser
4. เปิด Supabase SQL Editor แล้วรันไฟล์ `supabase/migrations/202607160001_initial_schema.sql`
5. ใช้ `npm run dev` แล้วเปิด `http://localhost:3000`

## ความปลอดภัย

- ห้าม commit `.env.local`
- Publishable key ใช้ได้ใน browser แต่ service-role key ต้องไม่ออกจาก server เด็ดขาด
- เนื่องจาก service-role key ถูกส่งผ่านแชตแล้ว ควรหมุน (rotate) key จากหน้า Supabase Dashboard ก่อนนำระบบขึ้นใช้งานจริง
- RLS ใน migration จำกัดข้อมูลตามบทบาท Owner, Staff และ Tenant

## สถานะการพัฒนา

Phase 1 พร้อมแล้ว: โครง Next.js, หน้าแรก/เข้าสู่ระบบ, Supabase clients, health endpoint และ schema พร้อม RLS. โมดูลจัดการห้อง ผู้เช่า บิล และการชำระเงินจะต่อยอดบน schema นี้ใน Phase 2–3.
