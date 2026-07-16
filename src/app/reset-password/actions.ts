"use server";
import {redirect} from "next/navigation"; import {createClient} from "@/lib/supabase/server";
export type ResetState={error?:string};
export async function resetPassword(_:ResetState,formData:FormData):Promise<ResetState>{const password=String(formData.get("password")??"");const confirm=String(formData.get("confirm")??"");if(password.length<8)return {error:"รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"};if(password!==confirm)return {error:"รหัสผ่านไม่ตรงกัน"};const s=await createClient();const {error}=await s.auth.updateUser({password});if(error)return {error:"ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่"};redirect("/dashboard")}
