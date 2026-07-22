"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyLineAdmin } from "@/lib/line";
import { paymentRoomConfirmationMessage } from "@/lib/line-payment-room-message";

export type PaymentState = { error?: string; success?: string };
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function readFields(formData: FormData) {
  return { amount: Number(formData.get("amount")), method: String(formData.get("method") ?? "cash"), paidAt: String(formData.get("paidAt") ?? ""), reference: String(formData.get("reference") ?? "").trim() };
}
function bangkokToUtc(paidAt: string) {
  return new Date(`${paidAt}:00+07:00`).toISOString();
}
function validateFields(amount: number, method: string, paidAt: string) {
  if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(new Date(paidAt).getTime())) return "กรุณากรอกยอดและวันรับชำระให้ถูกต้อง";
  if (!["cash", "transfer", "qr"].includes(method)) return "วิธีชำระเงินไม่ถูกต้อง";
  return null;
}
async function uploadSlip(supabase: any, invoiceId: string, file: File) {
  if (!allowedTypes.includes(file.type)) return { error: "สลิปรองรับเฉพาะ JPG, PNG, WebP หรือ PDF" };
  if (file.size > 5 * 1024 * 1024) return { error: "ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB" };
  const extension = (file.name.split(".").pop() || (file.type === "application/pdf" ? "pdf" : "jpg")).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const path = `${invoiceId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("payment-slips").upload(path, file, { contentType: file.type, upsert: false });
  return error ? { error: "อัปโหลดสลิปไม่สำเร็จ กรุณาตรวจสอบว่าได้รัน migration ล่าสุดแล้ว" } : { path };
}
async function revalidatePaymentPages() { ["/payments", "/invoices", "/dashboard", "/reports"].forEach((path) => revalidatePath(path)); }

export async function recordPayment(_: PaymentState, formData: FormData): Promise<PaymentState> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { amount, method, paidAt, reference } = readFields(formData);
  const validation = validateFields(amount, method, paidAt);
  if (!invoiceId || validation) return { error: validation ?? "กรุณาเลือกใบแจ้งหนี้" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์รับชำระเงิน" };

  const { data: invoice } = await supabase.from("invoices").select("total_amount,invoice_number,status,rooms(room_number)").eq("id", invoiceId).maybeSingle();
  if (!invoice || !["issued", "overdue"].includes(invoice.status)) return { error: "ใบแจ้งหนี้นี้ไม่อยู่ในสถานะที่รับชำระได้" };
  const { data: previousPayments } = await supabase.from("payments").select("amount").eq("invoice_id", invoiceId);
  const alreadyPaid = (previousPayments ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
  const outstanding = Math.max(0, Number(invoice.total_amount) - alreadyPaid);
  if (amount > outstanding + 0.001) return { error: `ยอดชำระเกินยอดคงเหลือ ${outstanding.toLocaleString("th-TH")} บาท` };

  const slip = formData.get("slip");
  let slipPath: string | null = null;
  if (slip instanceof File && slip.size > 0) {
    const uploaded = await uploadSlip(supabase, invoiceId, slip);
    if (uploaded.error) return { error: uploaded.error };
    slipPath = uploaded.path ?? null;
  }
  const { error } = await supabase.from("payments").insert({ invoice_id: invoiceId, amount, method, reference: reference || null, slip_path: slipPath, paid_at: bangkokToUtc(paidAt), recorded_by: user.id });
  if (error) { if (slipPath) await supabase.storage.from("payment-slips").remove([slipPath]); return { error: "ไม่สามารถบันทึกการชำระเงินได้" }; }
  if (alreadyPaid + amount >= Number(invoice.total_amount) - 0.001) await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
  const roomNumber = invoice.rooms?.[0]?.room_number ?? "-";
  await notifyLineAdmin(supabase, paymentRoomConfirmationMessage(roomNumber, amount, method));
  await revalidatePaymentPages();
  return { success: `บันทึกรับชำระ ${invoice.invoice_number} จำนวน ${amount.toLocaleString("th-TH")} บาทแล้ว` };
}

export async function updatePayment(paymentId: string, formData: FormData): Promise<PaymentState> {
  const { amount, method, paidAt, reference } = readFields(formData);
  const validation = validateFields(amount, method, paidAt);
  if (validation) return { error: validation };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return { error: "คุณไม่มีสิทธิ์แก้ไขรายการนี้" };

  const { data: payment } = await supabase.from("payments").select("invoice_id,slip_path").eq("id", paymentId).maybeSingle();
  if (!payment) return { error: "ไม่พบรายการรับชำระ" };
  const { data: invoice } = await supabase.from("invoices").select("total_amount,due_date,status").eq("id", payment.invoice_id).maybeSingle();
  if (!invoice || invoice.status === "void") return { error: "ไม่สามารถแก้ไขรายการของบิลที่ยกเลิกแล้ว" };
  const { data: otherPayments } = await supabase.from("payments").select("amount").eq("invoice_id", payment.invoice_id).neq("id", paymentId);
  const paidByOthers = (otherPayments ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
  const allowed = Math.max(0, Number(invoice.total_amount) - paidByOthers);
  if (amount > allowed + 0.001) return { error: `ยอดแก้ไขเกินยอดที่รับได้ ${allowed.toLocaleString("th-TH")} บาท` };

  const slip = formData.get("slip");
  const removeSlip = formData.get("removeSlip") === "on";
  let newPath: string | null | undefined = removeSlip ? null : undefined;
  if (slip instanceof File && slip.size > 0) {
    const uploaded = await uploadSlip(supabase, payment.invoice_id, slip);
    if (uploaded.error) return { error: uploaded.error };
    newPath = uploaded.path;
  }
  const update: Record<string, unknown> = { amount, method, reference: reference || null, paid_at: bangkokToUtc(paidAt) };
  if (newPath !== undefined) update.slip_path = newPath;
  const { error } = await supabase.from("payments").update(update).eq("id", paymentId);
  if (error) { if (newPath) await supabase.storage.from("payment-slips").remove([newPath]); return { error: "ไม่สามารถแก้ไขรายการรับชำระได้" }; }
  if (payment.slip_path && newPath !== undefined && payment.slip_path !== newPath) await supabase.storage.from("payment-slips").remove([payment.slip_path]);

  const newTotal = paidByOthers + amount;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  await supabase.from("invoices").update({ status: newTotal >= Number(invoice.total_amount) - 0.001 ? "paid" : invoice.due_date < today ? "overdue" : "issued" }).eq("id", payment.invoice_id);
  await revalidatePaymentPages();
  return { success: "แก้ไขรายการรับชำระเรียบร้อยแล้ว" };
}