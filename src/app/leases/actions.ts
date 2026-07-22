"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatBaht, notifyLineAdmin } from "@/lib/line";

export type LeaseFormState = { error?: string; success?: string };

export async function createLease(_: LeaseFormState, formData: FormData): Promise<LeaseFormState> {
  const roomId = String(formData.get("roomId") ?? "");
  const tenantId = String(formData.get("tenantId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const rentAmount = Number(formData.get("rentAmount"));
  const depositAmount = Number(formData.get("depositAmount") ?? 0);
  if (!roomId || !tenantId || !startDate || !endDate || !Number.isFinite(rentAmount) || rentAmount < 0 || !Number.isFinite(depositAmount) || depositAmount < 0 || endDate <= startDate) return { error: "กรุณากรอกข้อมูลสัญญาให้ครบถ้วนและตรวจสอบวันเริ่ม/สิ้นสุด" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์สร้างสัญญาเช่า" };

  const [{ data: room }, { data: tenant }, { data: activeLease }] = await Promise.all([
    supabase.from("rooms").select("status,room_number").eq("id", roomId).is("deleted_at", null).maybeSingle(),
    supabase.from("profiles").select("full_name,role").eq("id", tenantId).maybeSingle(),
    supabase.from("leases").select("id,rooms(room_number)").eq("tenant_id", tenantId).eq("active", true).maybeSingle(),
  ]);
  if (!room || room.status !== "vacant") return { error: "ห้องนี้ไม่ว่างแล้ว กรุณาเลือกห้องอื่น" };
  if (!tenant || tenant.role !== "tenant") return { error: "ไม่พบข้อมูลผู้เช่าที่เลือก" };
  const activeRoom = activeLease?.rooms?.[0]?.room_number;
  if (activeLease) return { error: `${tenant.full_name} มีสัญญาใช้งานอยู่แล้ว${activeRoom ? ` (ห้อง ${activeRoom})` : ""} กรุณาปิดหรือย้ายออกจากสัญญาเดิมก่อน` };

  const { error } = await supabase.from("leases").insert({ room_id: roomId, tenant_id: tenantId, start_date: startDate, end_date: endDate, rent_amount: rentAmount, deposit_amount: depositAmount });
  if (error) return { error: error.code === "23505" ? "ผู้เช่ารายนี้มีสัญญาที่ใช้งานอยู่แล้ว กรุณาปิดสัญญาเดิมก่อน" : "ไม่สามารถบันทึกสัญญาเช่าได้" };
  const { error: roomError } = await supabase.from("rooms").update({ status: "occupied" }).eq("id", roomId).eq("status", "vacant");
  if (roomError) return { error: "บันทึกสัญญาแล้ว แต่ไม่สามารถอัปเดตสถานะห้องได้" };
  await notifyLineAdmin(supabase, `มีผู้เช่าใหม่` + "\n" + `ห้อง ${room.room_number}: ${tenant.full_name}` + "\n" + `ค่าเช่า ${formatBaht(rentAmount)}/เดือน`);
  ["/leases", "/rooms", "/dashboard", "/alerts"].forEach((path) => revalidatePath(path));
  return { success: `สร้างสัญญาห้อง ${room.room_number} สำหรับ ${tenant.full_name} เรียบร้อยแล้ว` };
}
export async function closeLease(leaseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return;
  const { data: lease } = await supabase.from("leases").select("room_id").eq("id", leaseId).eq("active", true).maybeSingle();
  if (!lease) return;
  const { error } = await supabase.from("leases").update({ active: false }).eq("id", leaseId);
  if (error) return;
  await supabase.from("rooms").update({ status: "vacant" }).eq("id", lease.room_id);
  await notifyLineAdmin(supabase, "ห้องว่าง\nมีการปิดสัญญาเช่าแล้ว โปรดตรวจสอบห้องและเตรียมเปิดเช่า");
  revalidatePath("/leases");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
}
export async function updateLeaseDetails(leaseId:string, values:{startDate:string;endDate:string;rentAmount:number;depositAmount:number}) { if(!values.startDate||!values.endDate||values.endDate<=values.startDate||[values.rentAmount,values.depositAmount].some(v=>!Number.isFinite(v)||v<0))return; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle(); if(!profile||!["owner","staff"].includes(profile.role))return; await supabase.from("leases").update({start_date:values.startDate,end_date:values.endDate,rent_amount:values.rentAmount,deposit_amount:values.depositAmount}).eq("id",leaseId).eq("active",true); revalidatePath("/leases"); revalidatePath("/dashboard"); }
async function leaseManager(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return {supabase,user:null,role:null as string|null};const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();return {supabase,user,role:profile?.role??null};}
export async function renewLease(leaseId:string,values:{endDate:string;rentAmount:number}){if(!values.endDate||!Number.isFinite(values.rentAmount)||values.rentAmount<0)return;const {supabase,role}=await leaseManager();if(!role||!["owner","staff"].includes(role))return;const {data:lease}=await supabase.from("leases").select("start_date").eq("id",leaseId).eq("active",true).maybeSingle();if(!lease||values.endDate<=lease.start_date)return;await supabase.from("leases").update({end_date:values.endDate,rent_amount:values.rentAmount}).eq("id",leaseId);revalidatePath("/leases");revalidatePath("/alerts");}
export async function moveOutLease(leaseId:string,values:{date:string;deduction:number;note:string}){if(!values.date||!Number.isFinite(values.deduction)||values.deduction<0)return;const {supabase,user,role}=await leaseManager();if(!user||!role||!["owner","staff"].includes(role))return;const {data:lease}=await supabase.from("leases").select("room_id,deposit_amount").eq("id",leaseId).eq("active",true).maybeSingle();if(!lease)return;const deposit=Number(lease.deposit_amount);const refund=Math.max(0,deposit-values.deduction);const {error}=await supabase.from("lease_move_outs").insert({lease_id:leaseId,moved_out_at:values.date,deposit_amount:deposit,deduction_amount:values.deduction,refund_amount:refund,note:values.note,recorded_by:user.id});if(error)return;await supabase.from("leases").update({active:false}).eq("id",leaseId);await supabase.from("rooms").update({status:"vacant"}).eq("id",lease.room_id);await notifyLineAdmin(supabase,"ห้องว่าง\nผู้เช่าย้ายออกแล้ว โปรดตรวจสอบห้องและเตรียมเปิดเช่า");revalidatePath("/leases");revalidatePath("/rooms");revalidatePath("/dashboard");}