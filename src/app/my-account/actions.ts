"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export type TenantRequestState={error?:string;success?:string};
export async function reportIssue(_:TenantRequestState,formData:FormData):Promise<TenantRequestState>{const title=String(formData.get("title")??"").trim();const description=String(formData.get("description")??"").trim();if(!title)return {error:"กรุณาระบุหัวข้อปัญหา"};const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return {error:"กรุณาเข้าสู่ระบบ"};const {data:lease}=await s.from("leases").select("room_id").eq("tenant_id",user.id).eq("active",true).maybeSingle();if(!lease)return {error:"ไม่พบสัญญาเช่าที่ใช้งานอยู่"};const {error}=await s.from("maintenance_requests").insert({room_id:lease.room_id,reported_by:user.id,title,description,priority:2});if(error)return {error:"ส่งแจ้งซ่อมไม่สำเร็จ"};revalidatePath("/my-account");return {success:"ส่งแจ้งซ่อมแล้ว"}}
