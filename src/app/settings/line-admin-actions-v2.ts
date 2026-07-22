"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LineAdminActionState = { error?: string; success?: string; code?: string };

async function currentManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as string | null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, user, role: profile?.role ?? null };
}

export async function createAdditionalLineLinkCode(_: LineAdminActionState): Promise<LineAdminActionState> {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_CHANNEL_SECRET) return { error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ LINE บนเซิร์ฟเวอร์" };
  const { supabase, user, role } = await currentManager();
  if (!user || !["owner", "staff"].includes(role ?? "")) return { error: "ไม่มีสิทธิ์เชื่อม LINE" };
  const code = randomBytes(4).toString("hex").toUpperCase();
  const { error } = await supabase.from("line_admin_connections").insert({ profile_id: user.id, link_code: code, link_code_expires_at: new Date(Date.now() + 600_000).toISOString(), enabled: true });
  if (error) return { error: "สร้างรหัสไม่สำเร็จ กรุณารัน migration ล่าสุด" };
  revalidatePath("/settings");
  return { code, success: "สร้างรหัสสำหรับเพิ่ม LINE แล้ว" };
}

export async function setLineConnectionEnabled(connectionId: string, enabled: boolean): Promise<LineAdminActionState> {
  const { supabase, user, role } = await currentManager();
  if (!user || !["owner", "staff"].includes(role ?? "")) return { error: "ไม่มีสิทธิ์เปลี่ยนการตั้งค่า" };
  const { error } = await supabase.from("line_admin_connections").update({ enabled, updated_at: new Date().toISOString() }).eq("id", connectionId).eq("profile_id", user.id);
  if (error) return { error: "เปลี่ยนสถานะไม่สำเร็จ" };
  revalidatePath("/settings");
  return { success: enabled ? "เปิดการแจ้งเตือนแล้ว" : "ปิดการแจ้งเตือนแล้ว" };
}

export async function disconnectLineConnection(connectionId: string): Promise<LineAdminActionState> {
  const { supabase, user, role } = await currentManager();
  if (!user || !["owner", "staff"].includes(role ?? "")) return { error: "ไม่มีสิทธิ์ยกเลิกการเชื่อมต่อ" };
  const { error } = await supabase.from("line_admin_connections").delete().eq("id", connectionId).eq("profile_id", user.id);
  if (error) return { error: "ยกเลิกการเชื่อมต่อไม่สำเร็จ" };
  revalidatePath("/settings");
  return { success: "ยกเลิกการเชื่อมต่อ LINE แล้ว" };
}
