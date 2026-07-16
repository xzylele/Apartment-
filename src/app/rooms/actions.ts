"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RoomFormState = { error?: string; success?: string };

function numberValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "");
  return raw === "" ? null : Number(raw);
}

export async function createRoom(_: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const roomNumber = String(formData.get("roomNumber") ?? "").trim();
  const floor = numberValue(formData, "floor");
  const roomType = String(formData.get("roomType") ?? "").trim();
  const monthlyRent = numberValue(formData, "monthlyRent");
  const deposit = numberValue(formData, "deposit") ?? 0;
  const waterRate = numberValue(formData, "waterRate") ?? 0;
  const electricRate = numberValue(formData, "electricRate") ?? 0;

  if (!roomNumber || !floor || !roomType || monthlyRent === null || floor < 1 || floor > 4 || monthlyRent < 0 || !["ห้องพัดลม", "ห้องแอร์"].includes(roomType)) {
    return { error: "กรุณากรอกเลขห้อง ชั้น ประเภทห้อง และค่าเช่าให้ถูกต้อง" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์เพิ่มห้องพัก" };

  const { error } = await supabase.from("rooms").insert({
    room_number: roomNumber, floor, room_type: roomType, monthly_rent: monthlyRent, deposit,
    size_sqm: numberValue(formData, "sizeSqm"), water_rate: waterRate,
    electric_rate: electricRate,
  });
  if (error?.code === "23505") return { error: "มีเลขห้องนี้อยู่แล้ว" };
  if (error) return { error: "ไม่สามารถบันทึกห้องพักได้ กรุณาลองใหม่" };
  if (profile.role === "owner") {
    const { error: settingError } = await supabase.from("app_settings").upsert({ id: true, default_water_rate: waterRate, default_electric_rate: electricRate, default_room_floor: floor, default_room_type: roomType });
    if (settingError) { revalidatePath("/rooms"); return { success: `เพิ่มห้อง ${roomNumber} แล้ว แต่ยังบันทึกค่าเริ่มต้นไม่ได้ กรุณารัน migration 005` }; }
  }
  revalidatePath("/rooms");
  return { success: `เพิ่มห้อง ${roomNumber} แล้ว` };
}

type RoomUpdate = { roomType: string; monthlyRent: number; status: "vacant" | "occupied" | "maintenance" };
async function managerClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, role: null as string | null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, role: profile?.role ?? null };
}
export async function updateRoom(roomId: string, values: RoomUpdate) {
  if (!values.roomType || !Number.isFinite(values.monthlyRent) || values.monthlyRent < 0) return;
  const { supabase, role } = await managerClient();
  if (!role || !["owner", "staff"].includes(role)) return;
  await supabase.from("rooms").update({ room_type: values.roomType, monthly_rent: values.monthlyRent, status: values.status }).eq("id", roomId).is("deleted_at", null);
  revalidatePath("/rooms"); revalidatePath("/dashboard");
}
export async function archiveRoom(roomId: string) {
  const { supabase, role } = await managerClient();
  if (role !== "owner") return;
  const { data: room } = await supabase.from("rooms").select("status").eq("id", roomId).maybeSingle();
  if (!room || room.status === "occupied") return;
  await supabase.from("rooms").update({ deleted_at: new Date().toISOString() }).eq("id", roomId);
  revalidatePath("/rooms"); revalidatePath("/dashboard");
}
type RoomDetails = { roomNumber:string; floor:number; roomType:string; sizeSqm:number|null; monthlyRent:number; deposit:number; waterRate:number; electricRate:number; status:"vacant"|"occupied"|"maintenance" };
export async function updateRoomDetails(roomId:string, values:RoomDetails) {
  if (!values.roomNumber || !values.roomType || !Number.isInteger(values.floor) || values.floor < 1 || values.floor > 4 || !["ห้องพัดลม", "ห้องแอร์"].includes(values.roomType) || [values.monthlyRent,values.deposit,values.waterRate,values.electricRate].some((value)=>!Number.isFinite(value)||value<0) || (values.sizeSqm !== null && (!Number.isFinite(values.sizeSqm) || values.sizeSqm < 0))) return;
  const {supabase,role}=await managerClient();
  if(!role || !["owner","staff"].includes(role)) return;
  const {data:existing}=await supabase.from("rooms").select("status").eq("id",roomId).maybeSingle();
  if (role === "staff" && existing?.status === "occupied" && values.status === "vacant") return;
  await supabase.from("rooms").update({room_number:values.roomNumber,floor:values.floor,room_type:values.roomType,size_sqm:values.sizeSqm,monthly_rent:values.monthlyRent,deposit:values.deposit,water_rate:values.waterRate,electric_rate:values.electricRate,status:values.status}).eq("id",roomId).is("deleted_at",null);
  revalidatePath("/rooms"); revalidatePath("/dashboard");
}