"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
export type RecoveryState={error?:string;success?:string};
export async function requestRecovery(_:RecoveryState, formData:FormData):Promise<RecoveryState>{const email=String(formData.get("email")??"").trim();if(!email)return {error:"กรุณากรอกอีเมล"};const h=await headers();const origin=h.get("origin")||"http://localhost:3000";const s=await createClient();const {error}=await s.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/callback?next=/reset-password`});if(error)return {error:"ไม่สามารถส่งลิงก์ได้ กรุณาลองใหม่"};return {success:"หากมีบัญชีนี้ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว"}}
