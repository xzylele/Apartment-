"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UserFormState = { error?: string; success?: string };

export async function createUser(_: UserFormState, formData: FormData): Promise<UserFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "tenant");
  if (!fullName || !email || password.length < 8 || !["tenant", "staff"].includes(role)) return { error: "กรอกชื่อ อีเมล รหัสผ่านอย่างน้อย 8 ตัวอักษร และบทบาทให้ถูกต้อง" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") return { error: "เฉพาะเจ้าของเท่านั้นที่เพิ่มบัญชีได้" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error) return { error: error.message.includes("already") ? "อีเมลนี้ถูกใช้งานแล้ว" : "ไม่สามารถสร้างบัญชีได้" };
  if (!data.user) return { error: "ไม่สามารถสร้างบัญชีได้" };
  const { error: roleError } = await admin.from("profiles").update({ role, full_name: fullName }).eq("id", data.user.id);
  if (roleError) return { error: "สร้างบัญชีแล้ว แต่กำหนดบทบาทไม่สำเร็จ" };
  revalidatePath("/tenants");
  return { success: `สร้างบัญชี ${fullName} แล้ว` };
}

export async function updateTenant(tenantId: string, formData: FormData): Promise<UserFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!tenantId || !fullName) return { error: "กรุณาระบุชื่อผู้เช่า" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: editor } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!editor || !["owner", "staff"].includes(editor.role)) return { error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้เช่า" };
  const { data: target } = await supabase.from("profiles").select("role").eq("id", tenantId).maybeSingle();
  if (!target || target.role !== "tenant") return { error: "แก้ไขได้เฉพาะข้อมูลผู้เช่าเท่านั้น" };
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", tenantId);
  if (error) return { error: "ไม่สามารถบันทึกข้อมูลผู้เช่าได้" };
  ["/tenants", "/rooms", "/leases", "/dashboard"].forEach((path) => revalidatePath(path));
  return { success: "บันทึกข้อมูลผู้เช่าเรียบร้อยแล้ว" };
}
export async function deleteTenant(tenantId: string): Promise<UserFormState> {
  if (!tenantId) return { error: "ไม่พบผู้เช่าที่ต้องการลบ" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: editor } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (editor?.role !== "owner") return { error: "เฉพาะเจ้าของเท่านั้นที่ลบผู้เช่าได้" };
  const { data: target } = await supabase.from("profiles").select("full_name,role").eq("id", tenantId).maybeSingle();
  if (!target || target.role !== "tenant") return { error: "ลบได้เฉพาะบัญชีผู้เช่าเท่านั้น" };
  const { count, error: leaseError } = await supabase.from("leases").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  if (leaseError) return { error: "ไม่สามารถตรวจสอบประวัติสัญญาได้" };
  if ((count ?? 0) > 0) return { error: "ลบผู้เช่ารายนี้ไม่ได้ เพราะมีประวัติสัญญาอยู่แล้ว เพื่อรักษาข้อมูลย้อนหลัง" };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(tenantId);
  if (error) return { error: "ไม่สามารถลบบัญชีผู้เช่าได้" };
  ["/tenants", "/rooms", "/leases", "/dashboard"].forEach((path) => revalidatePath(path));
  return { success: `ลบผู้เช่า ${target.full_name} เรียบร้อยแล้ว` };
}