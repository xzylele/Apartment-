"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";

export function DashboardPeriod({ range, from, to }: { range: string; from: string; to: string }) {
  const [selected, setSelected] = useState(range);
  return <form className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <label className="text-xs font-medium text-slate-500"><span className="mb-1 flex items-center gap-1"><CalendarRange size={13}/>ช่วงข้อมูล</span><select name="range" value={selected} onChange={(event) => setSelected(event.target.value)} className="min-w-36 rounded-xl border px-3 py-2 text-sm"><option value="today">วันนี้</option><option value="month">เดือนนี้</option><option value="previous">เดือนก่อน</option><option value="custom">กำหนดเอง</option></select></label>
    {selected === "custom" && <><label className="text-xs font-medium text-slate-500">ตั้งแต่<input name="from" type="date" defaultValue={from} className="mt-1 block rounded-xl border px-3 py-2 text-sm"/></label><label className="text-xs font-medium text-slate-500">ถึง<input name="to" type="date" defaultValue={to} className="mt-1 block rounded-xl border px-3 py-2 text-sm"/></label></>}
    <button className="h-10 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white">แสดงข้อมูล</button>
  </form>;
}
