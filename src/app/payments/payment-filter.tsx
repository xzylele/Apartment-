"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

export function PaymentFilter({ total }: { total: number }) {
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [method, setMethod] = useState("all");
  const [visible, setVisible] = useState(total);
  const apply = (nextQuery: string, nextMonth: string, nextMethod: string) => {
    let count = 0;
    document.querySelectorAll<HTMLElement>("[data-payment-row]").forEach((row) => {
      const match = (row.dataset.payment ?? "").includes(nextQuery.trim().toLowerCase()) && (!nextMonth || row.dataset.month === nextMonth) && (nextMethod === "all" || row.dataset.method === nextMethod);
      row.hidden = !match;
      if (match) count += 1;
    });
    setVisible(count);
  };
  const reset = () => { setQuery(""); setMonth(""); setMethod("all"); apply("", "", "all"); };
  const active = Boolean(query || month || method !== "all");

  return <div className="border-b border-slate-100 p-4"><div className="flex flex-wrap gap-3"><label className="relative min-w-56 flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={(event) => { setQuery(event.target.value); apply(event.target.value, month, method); }} placeholder="ค้นหาเลขบิล ห้อง ผู้เช่า หรือเลขอ้างอิง" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm"/></label><input type="month" value={month} onChange={(event) => { setMonth(event.target.value); apply(query, event.target.value, method); }} className="rounded-xl border px-3 py-2 text-sm"/><select value={method} onChange={(event) => { setMethod(event.target.value); apply(query, month, event.target.value); }} className="rounded-xl border px-3 py-2 text-sm"><option value="all">ทุกวิธีชำระ</option><option value="cash">เงินสด</option><option value="transfer">โอนเงิน</option><option value="qr">QR Code</option></select>{active && <button onClick={reset} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><X size={15}/>ล้างตัวกรอง</button>}</div><p className="mt-2 text-xs text-slate-500">แสดง {visible} จาก {total} รายการล่าสุด</p></div>;
}