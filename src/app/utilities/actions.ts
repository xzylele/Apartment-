"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatBaht, notifyLineAdmin } from "@/lib/line";

export type UtilityState = { error?: string; success?: string };

export async function saveUtilityBills(_: UtilityState, formData: FormData): Promise<UtilityState> {
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "กรุณาเลือกเดือนให้ถูกต้อง" };
  const rows = [
    { utility_type: "water", provider_units: Number(formData.get("waterUnits")), amount: Number(formData.get("waterAmount")), due_date: String(formData.get("waterDue") ?? "") || null, paid_date: String(formData.get("waterPaid") ?? "") || null, note: String(formData.get("waterNote") ?? "").trim() || null },
    { utility_type: "electric", provider_units: Number(formData.get("electricUnits")), amount: Number(formData.get("electricAmount")), due_date: String(formData.get("electricDue") ?? "") || null, paid_date: String(formData.get("electricPaid") ?? "") || null, note: String(formData.get("electricNote") ?? "").trim() || null },
  ];
  if (rows.some((row) => !Number.isFinite(row.provider_units) || row.provider_units < 0 || !Number.isFinite(row.amount) || row.amount < 0)) return { error: "หน่วยและจำนวนเงินต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") return { error: "เฉพาะเจ้าของเท่านั้นที่บันทึกต้นทุนค่าน้ำ–ค่าไฟได้" };
  const billMonth = `${month}-01`;
  const payload = rows.map((row) => ({ ...row, bill_month: billMonth, created_by: user.id, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("utility_bills").upsert(payload, { onConflict: "bill_month,utility_type" });
  if (error?.code === "42P01") return { error: "ยังไม่ได้สร้างตาราง utility_bills กรุณารัน migration 014 ก่อน" };
  if (error) return { error: "บันทึกบิลค่าน้ำ–ค่าไฟไม่สำเร็จ" };
  await notifyLineAdmin(supabase, `บันทึกค่าน้ำค่าไฟ ${month}` + "\n" + `ค่าน้ำ ${formatBaht(rows[0].amount)}` + "\n" + `ค่าไฟ ${formatBaht(rows[1].amount)}`);
  ["/utilities", "/dashboard", "/reports"].forEach((path) => revalidatePath(path));
  return { success: "บันทึกต้นทุนค่าน้ำ–ค่าไฟเรียบร้อยแล้ว" };
}
