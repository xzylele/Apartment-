# การสร้างบัญชีแรก

1. รัน migration ทั้งสองไฟล์ใน `supabase/migrations` ผ่าน Supabase SQL Editor ตามลำดับชื่อไฟล์
2. ไปที่ **Authentication → Users → Add user** ใน Supabase Dashboard แล้วสร้างผู้ใช้ด้วยอีเมลและรหัสผ่านที่ต้องการ
3. คัดลอก UUID ของผู้ใช้นั้น แล้วรันคำสั่งนี้ใน SQL Editor:

```sql
update public.profiles
set role = 'owner'
where id = 'UUID_ของคุณ';
```

4. เริ่มเว็บด้วย `npm run dev` และเปิด `http://localhost:3000/login`
5. ใช้อีเมลและรหัสผ่านจากข้อ 2 เพื่อเข้าสู่ระบบ

ผู้ใช้ใหม่จาก Supabase Auth จะได้รับบทบาท `tenant` โดยอัตโนมัติ เพื่อไม่ให้มีใครสร้างบัญชีเจ้าของเองได้.
