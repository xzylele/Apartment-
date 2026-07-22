"use client";

import { useActionState, useEffect, useState } from "react";
import { Droplets, Pencil, X, Zap } from "lucide-react";
import { saveUtilityBills, type UtilityState } from "./actions";

type Bill = { provider_units: number; amount: number; due_date: string | null; paid_date: string | null; note: string | null } | null;
const initialState: UtilityState = {};

export function UtilityBillForm({ month, water, electric }: { month: string; water: Bill; electric: Bill }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveUtilityBills, initialState);
  useEffect(() => { if (state.success) setOpen(false); }, [state.success]);
  const field = "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm";
  return <><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white"><Pencil size={16}/>{water || electric ? "แก้ไขบิลจริง" : "บันทึกบิลจริง"}</button>{open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}><form action={action} onMouseDown={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><input type="hidden" name="month" value={month}/><div className="flex items-start justify-between border-b p-5"><div><h2 className="font-bold">บันทึกบิลค่าน้ำ–ค่าไฟของอาคาร</h2><p className="mt-1 text-sm text-slate-500">กรอกหน่วยและยอดตามใบแจ้งหนี้จากผู้ให้บริการ</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100"><X size={18}/></button></div><div className="grid gap-5 p-5 lg:grid-cols-2"><UtilityFields type="water" label="บิลค่าน้ำ" icon={<Droplets size={18}/>} bill={water} field={field}/><UtilityFields type="electric" label="บิลค่าไฟ" icon={<Zap size={18}/>} bill={electric} field={field}/>{state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-2">{state.error}</p>}</div><div className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm">ยกเลิก</button><button disabled={pending} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white">{pending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button></div></form></div>}</>;
}

function UtilityFields({ type, label, icon, bill, field }: { type: "water" | "electric"; label: string; icon: React.ReactNode; bill: Bill; field: string }) {
  return <section className={`rounded-2xl border p-4 ${type === "water" ? "border-blue-100 bg-blue-50/40" : "border-amber-100 bg-amber-50/40"}`}><h3 className={`flex items-center gap-2 font-semibold ${type === "water" ? "text-blue-800" : "text-amber-800"}`}>{icon}{label}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">หน่วยจากผู้ให้บริการ<input name={`${type}Units`} type="number" min="0" step="0.01" required defaultValue={bill?.provider_units ?? 0} className={field}/></label><label className="text-sm font-medium">ยอดบิลจริง<input name={`${type}Amount`} type="number" min="0" step="0.01" required defaultValue={bill?.amount ?? 0} className={field}/></label><label className="text-sm font-medium">วันครบกำหนด<input name={`${type}Due`} type="date" defaultValue={bill?.due_date ?? ""} className={field}/></label><label className="text-sm font-medium">วันที่ชำระ<input name={`${type}Paid`} type="date" defaultValue={bill?.paid_date ?? ""} className={field}/></label><label className="text-sm font-medium sm:col-span-2">หมายเหตุ<textarea name={`${type}Note`} defaultValue={bill?.note ?? ""} placeholder="เลขที่บิล หรือรายละเอียดเพิ่มเติม" className={field}/></label></div></section>;
}
