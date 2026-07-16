"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  return <form action={formAction} className="space-y-4"><label className="block text-sm font-medium">อีเมล<input name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="name@example.com" /></label><label className="block text-sm font-medium">รหัสผ่าน<input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="••••••••" /></label><a href="/forgot-password" className="block text-right text-sm text-teal-700">ลืมรหัสผ่าน?</a>{state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}<button disabled={pending} type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-teal-400"><LockKeyhole size={16}/>{pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button></form>;
}
