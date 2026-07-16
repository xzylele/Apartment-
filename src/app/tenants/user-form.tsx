"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createUser, type UserFormState } from "./actions";

const initialState: UserFormState = {};
export function UserForm() {
  const [state, action, pending] = useActionState(createUser, initialState);
  const style = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><UserPlus size={18} className="text-teal-600"/>เพิ่มผู้เช่าหรือพนักงาน</summary><form action={action} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">ชื่อ-นามสกุล<input name="fullName" required className={style}/></label><label className="text-sm font-medium">อีเมล<input name="email" type="email" required className={style}/></label><label className="text-sm font-medium">รหัสผ่านชั่วคราว<input name="password" type="password" minLength={8} required className={style}/></label><label className="text-sm font-medium">บทบาท<select name="role" className={style}><option value="tenant">ผู้เช่า</option><option value="staff">พนักงาน</option></select></label><div className="sm:col-span-2">{state.error && <p role="alert" className="mb-3 text-sm text-red-700">{state.error}</p>}{state.success && <p className="mb-3 text-sm text-teal-700">{state.success}</p>}<button disabled={pending} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-teal-400">{pending ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}</button></div></form></details>;
}
