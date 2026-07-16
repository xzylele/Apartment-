"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearLoginAttempts, isLoginAllowed, registerLoginFailure } from "@/lib/security/login-rate-limit";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rateKey = `${ip}:${email.toLowerCase()}`;
  if (!isLoginAllowed(rateKey)) return { error: "ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { registerLoginFailure(rateKey); return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }; }
  clearLoginAttempts(rateKey);
  redirect("/dashboard");
}
