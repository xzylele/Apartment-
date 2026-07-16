"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MeterFormState = { error?: string; success?: string };

export async function saveMeterReading(_: MeterFormState, formData: FormData): Promise<MeterFormState> {
  const roomId = String(formData.get("roomId") ?? "");
  const month = String(formData.get("month") ?? "");
  const waterCurrent = Number(formData.get("waterCurrent"));
  const electricCurrent = Number(formData.get("electricCurrent"));
  if (!roomId || !/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(waterCurrent) || !Number.isFinite(electricCurrent) || waterCurrent < 0 || electricCurrent < 0) return { error: "กรุณาเลือกห้อง เดือน และกรอกเลขมิเตอร์ให้ถูกต้อง" };
  const readingMonth = `${month}-01`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์บันทึกมิเตอร์" };
  const { data: previous } = await supabase.from("meter_readings").select("water_current, electric_current").eq("room_id", roomId).lt("reading_month", readingMonth).order("reading_month", { ascending: false }).limit(1).maybeSingle();
  const waterPrevious = Number(previous?.water_current ?? 0);
  const electricPrevious = Number(previous?.electric_current ?? 0);
  if (waterCurrent < waterPrevious || electricCurrent < electricPrevious) return { error: `เลขมิเตอร์ต้องไม่น้อยกว่าครั้งก่อน (น้ำ ${waterPrevious}, ไฟ ${electricPrevious})` };
  const { error } = await supabase.from("meter_readings").upsert({ room_id: roomId, reading_month: readingMonth, water_previous: waterPrevious, water_current: waterCurrent, electric_previous: electricPrevious, electric_current: electricCurrent, recorded_by: user.id }, { onConflict: "room_id,reading_month" });
  if (error) return { error: "ไม่สามารถบันทึกมิเตอร์ได้" };
  revalidatePath("/meters");
  return { success: "บันทึกเลขมิเตอร์เรียบร้อย" };
}

export async function updateMeterReading(id:string, roomId:string, readingMonth:string, waterCurrent:number, electricCurrent:number) { if(!Number.isFinite(waterCurrent)||!Number.isFinite(electricCurrent))return false; const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return false;const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();if(!p||!["owner","staff"].includes(p.role))return false;const {data:reading}=await supabase.from("meter_readings").select("water_previous,electric_previous").eq("id",id).maybeSingle();if(!reading||waterCurrent<Number(reading.water_previous)||electricCurrent<Number(reading.electric_previous))return false;const {data:invoice}=await supabase.from("invoices").select("id").eq("room_id",roomId).eq("billing_month",readingMonth).neq("status","void").maybeSingle();if(invoice)return false;const {error}=await supabase.from("meter_readings").update({water_current:waterCurrent,electric_current:electricCurrent}).eq("id",id);if(error)return false;revalidatePath("/meters");return true; }