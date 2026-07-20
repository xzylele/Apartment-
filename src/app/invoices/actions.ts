"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InvoiceState = { error?: string; success?: string };

export async function generateInvoices(_: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const month = String(formData.get("month") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month) || !dueDate) return { error: "กรุณาเลือกเดือนและวันครบกำหนด" };
  const billingMonth = `${month}-01`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์ออกบิล" };
  const { data: leases, error: leasesError } = await supabase.from("leases").select("id, room_id, rent_amount, rooms(room_number, water_rate, electric_rate)").eq("active", true);
  if (leasesError || !leases) return { error: "ไม่สามารถอ่านข้อมูลสัญญาเช่าได้" };
  let created = 0; let skipped = 0;
  for (const lease of leases as unknown as { id: string; room_id: string; rent_amount: number; rooms: { room_number: string; water_rate: number; electric_rate: number } | null }[]) {
    const { data: reading } = await supabase.from("meter_readings").select("water_previous, water_current, electric_previous, electric_current").eq("room_id", lease.room_id).eq("reading_month", billingMonth).maybeSingle();
    const room = lease.rooms;
    if (!room) { skipped++; continue; }
    const waterAmount = reading ? Number(reading.water_current - reading.water_previous) * Number(room.water_rate) : 0;
    const electricAmount = reading ? Number(reading.electric_current - reading.electric_previous) * Number(room.electric_rate) : 0;
    const invoiceNumber = `INV-${month.replace("-", "")}-${room.room_number}`;
    const { error } = await supabase.from("invoices").insert({ invoice_number: invoiceNumber, room_id: lease.room_id, lease_id: lease.id, billing_month: billingMonth, due_date: dueDate, rent_amount: lease.rent_amount, water_amount: waterAmount, electric_amount: electricAmount, status: "issued" });
    if (error?.code === "23505") { skipped++; continue; }
    if (error) return { error: "สร้างบิลไม่สำเร็จ กรุณาตรวจสอบข้อมูล" };
    created++;
  }
  revalidatePath("/invoices");
  return { success: `ออกบิล ${created} รายการ${skipped ? ` (ข้าม ${skipped} รายการที่มีบิลแล้ว)` : ""}` };
}

export async function cancelInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return;
  const { data: payments } = await supabase.from("payments").select("id").eq("invoice_id", invoiceId).limit(1);
  if (payments?.length) return;
  await supabase.from("invoices").update({ status: "void" }).eq("id", invoiceId).in("status", ["draft", "issued", "overdue"]);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}
export async function updateInvoice(invoiceId: string, _: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "");
  const amounts = { rent_amount: Number(formData.get("rentAmount")), water_amount: Number(formData.get("waterAmount")), electric_amount: Number(formData.get("electricAmount")), other_amount: Number(formData.get("otherAmount")) };
  const total = Object.values(amounts).reduce((sum, value) => sum + value, 0);
  if (!invoiceNumber || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Object.values(amounts).some((value) => !Number.isFinite(value) || value < 0)) return { error: "กรุณาตรวจสอบเลขที่บิล วันที่ และจำนวนเงิน" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์แก้ไขใบแจ้งหนี้" };
  const { data: invoice } = await supabase.from("invoices").select("status").eq("id", invoiceId).maybeSingle();
  if (!invoice || invoice.status === "void") return { error: "ไม่สามารถแก้ไขใบแจ้งหนี้ที่ยกเลิกแล้ว" };
  const { data: payments } = await supabase.from("payments").select("amount").eq("invoice_id", invoiceId);
  const paid = (payments ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
  if (total + 0.001 < paid) return { error: `ยอดรวมใหม่ต้องไม่น้อยกว่ายอดที่รับชำระแล้ว ${paid.toLocaleString("th-TH")} บาท` };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const status = paid >= total - 0.001 ? "paid" : dueDate < today ? "overdue" : "issued";
  const { error } = await supabase.from("invoices").update({ invoice_number: invoiceNumber, due_date: dueDate, ...amounts, status }).eq("id", invoiceId);
  if (error?.code === "23505") return { error: "เลขที่ใบแจ้งหนี้นี้ถูกใช้แล้ว" };
  if (error) return { error: "ไม่สามารถแก้ไขใบแจ้งหนี้ได้" };
  ["/invoices", "/payments", "/dashboard", "/reports"].forEach((path) => revalidatePath(path));
  return { success: "แก้ไขใบแจ้งหนี้เรียบร้อยแล้ว" };
}

export type InvoicePreviewItem = { leaseId: string; roomId: string; roomNumber: string; tenantName: string; rentAmount: number; waterAmount: number; electricAmount: number; totalAmount: number; hasMeter: boolean; existingInvoice: boolean };
export type InvoicePreviewResult = { items: InvoicePreviewItem[]; error?: string };

export async function previewInvoices(month: string): Promise<InvoicePreviewResult> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { items: [], error: "เดือนไม่ถูกต้อง" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { items: [], error: "คุณไม่มีสิทธิ์ดูตัวอย่างบิล" };
  const billingMonth = `${month}-01`;
  const { data: leases, error } = await supabase.from("leases").select("id,room_id,rent_amount,rooms(room_number,water_rate,electric_rate),profiles!leases_tenant_id_fkey(full_name)").eq("active", true);
  if (error) return { items: [], error: "ไม่สามารถโหลดข้อมูลสัญญาเช่าได้" };
  const roomIds = (leases ?? []).map((lease: any) => lease.room_id);
  if (!roomIds.length) return { items: [] };
  const [{ data: readings }, { data: existing }] = await Promise.all([
    supabase.from("meter_readings").select("room_id,water_previous,water_current,electric_previous,electric_current").eq("reading_month", billingMonth).in("room_id", roomIds),
    supabase.from("invoices").select("id,room_id,status").eq("billing_month", billingMonth).in("room_id", roomIds),
  ]);
  const readingByRoom = new Map((readings ?? []).map((reading: any) => [reading.room_id, reading]));
  const existingRooms = new Set((existing ?? []).filter((invoice: any) => invoice.status !== "void").map((invoice: any) => invoice.room_id));
  const voidByRoom = new Map((existing ?? []).filter((invoice: any) => invoice.status === "void").map((invoice: any) => [invoice.room_id, invoice.id]));
  return { items: (leases ?? []).map((lease: any) => {
    const room = Array.isArray(lease.rooms) ? lease.rooms[0] : lease.rooms;
    const tenant = Array.isArray(lease.profiles) ? lease.profiles[0] : lease.profiles;
    const reading: any = readingByRoom.get(lease.room_id);
    const rentAmount = Number(lease.rent_amount);
    const waterAmount = reading ? Number(reading.water_current - reading.water_previous) * Number(room?.water_rate ?? 0) : 0;
    const electricAmount = reading ? Number(reading.electric_current - reading.electric_previous) * Number(room?.electric_rate ?? 0) : 0;
    return { leaseId: lease.id, roomId: lease.room_id, roomNumber: room?.room_number ?? "-", tenantName: tenant?.full_name ?? "ไม่ระบุผู้เช่า", rentAmount, waterAmount, electricAmount, totalAmount: rentAmount + waterAmount + electricAmount, hasMeter: Boolean(reading), existingInvoice: existingRooms.has(lease.room_id) };
  }).sort((a: InvoicePreviewItem, b: InvoicePreviewItem) => a.roomNumber.localeCompare(b.roomNumber, "th", { numeric: true })) };
}

export async function generateSelectedInvoices(_: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const month = String(formData.get("month") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const roomIds = [...new Set(formData.getAll("roomIds").map(String).filter(Boolean))];
  if (!/^\d{4}-\d{2}$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: "กรุณาตรวจสอบเดือนและวันครบกำหนด" };
  if (!roomIds.length) return { error: "กรุณาเลือกอย่างน้อย 1 ห้อง" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์ออกบิล" };
  const billingMonth = `${month}-01`;
  const { data: leases } = await supabase.from("leases").select("id,room_id,rent_amount,rooms(room_number,water_rate,electric_rate)").eq("active", true).in("room_id", roomIds);
  const [{ data: readings }, { data: existing }] = await Promise.all([
    supabase.from("meter_readings").select("room_id,water_previous,water_current,electric_previous,electric_current").eq("reading_month", billingMonth).in("room_id", roomIds),
    supabase.from("invoices").select("id,room_id,status").eq("billing_month", billingMonth).in("room_id", roomIds),
  ]);
  const readingByRoom = new Map((readings ?? []).map((reading: any) => [reading.room_id, reading]));
  const existingRooms = new Set((existing ?? []).filter((invoice: any) => invoice.status !== "void").map((invoice: any) => invoice.room_id));
  const voidByRoom = new Map((existing ?? []).filter((invoice: any) => invoice.status === "void").map((invoice: any) => [invoice.room_id, invoice.id]));
  let created = 0, reissued = 0, skippedExisting = 0, skippedMeter = 0;
  for (const lease of (leases ?? []) as any[]) {
    if (existingRooms.has(lease.room_id)) { skippedExisting++; continue; }
    const reading: any = readingByRoom.get(lease.room_id);
    if (!reading) { skippedMeter++; continue; }
    const room = Array.isArray(lease.rooms) ? lease.rooms[0] : lease.rooms;
    if (!room) continue;
    const waterAmount = Number(reading.water_current - reading.water_previous) * Number(room.water_rate);
    const electricAmount = Number(reading.electric_current - reading.electric_previous) * Number(room.electric_rate);
    const invoiceNumber = `INV-${month.replace("-", "")}-${room.room_number}`;
    const voidInvoiceId = voidByRoom.get(lease.room_id);
    if (voidInvoiceId) {
      const { error } = await supabase.from("invoices").update({ invoice_number: invoiceNumber, lease_id: lease.id, due_date: dueDate, rent_amount: Number(lease.rent_amount), water_amount: waterAmount, electric_amount: electricAmount, other_amount: 0, status: "issued" }).eq("id", voidInvoiceId).eq("status", "void");
      if (error) return { error: `ออกบิลใหม่ห้อง ${room.room_number} ไม่สำเร็จ` };
      reissued++;
      continue;
    }
    const { error } = await supabase.from("invoices").insert({ invoice_number: invoiceNumber, room_id: lease.room_id, lease_id: lease.id, billing_month: billingMonth, due_date: dueDate, rent_amount: Number(lease.rent_amount), water_amount: waterAmount, electric_amount: electricAmount, status: "issued" });
    if (error?.code === "23505") { skippedExisting++; continue; }
    if (error) return { error: `สร้างบิลห้อง ${room.room_number} ไม่สำเร็จ` };
    created++;
  }
  ["/invoices", "/dashboard", "/alerts"].forEach((path) => revalidatePath(path));
  return { success: `ออกบิลสำเร็จ ${created + reissued} ห้อง${reissued ? ` · ออกใหม่จากบิลที่ยกเลิก ${reissued}` : ""}${skippedExisting ? ` · ข้ามบิลเดิม ${skippedExisting}` : ""}${skippedMeter ? ` · ข้ามมิเตอร์ไม่ครบ ${skippedMeter}` : ""}` };
}
