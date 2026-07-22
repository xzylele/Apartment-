"use client";

import { useActionState, useMemo, useState } from "react";
import { BanknoteArrowDown, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, Paperclip, ReceiptText } from "lucide-react";
import { recordPayment, type PaymentState } from "./actions";
import { bangkokDateTimeInput } from "@/lib/bangkok-time";

type Invoice = { id: string; invoice_number: string; outstanding: number; total_amount: number; due_date: string; room_number: string; tenant_name: string };
const initialState: PaymentState = {};
const nowLocal = () => bangkokDateTimeInput(new Date());
const field = "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm";

export function PaymentForm({ invoices }: { invoices: Invoice[] }) {
  const [state, action, pending] = useActionState(recordPayment, initialState);
  const [selected, setSelected] = useState(invoices[0]?.id ?? "");
  const [amount, setAmount] = useState(invoices[0]?.outstanding ?? 0);
  const [paidAt, setPaidAt] = useState(nowLocal());
  const [method, setMethod] = useState("cash");
  const current = useMemo(() => invoices.find((invoice) => invoice.id === selected), [invoices, selected]);
  const invalidAmount = !current || amount <= 0 || amount > current.outstanding;

  if (!invoices.length) return <section className="rounded-2xl border border-teal-100 bg-teal-50 p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-teal-700"><CheckCircle2 size={21}/></span><div><h2 className="font-bold text-teal-900">ไม่มีบิลที่รอรับชำระ</h2><p className="mt-1 text-sm text-teal-800">ใบแจ้งหนี้ทั้งหมดชำระครบแล้ว หรือยังไม่มีบิลที่ออกให้ผู้เช่า</p></div></div></section>;

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><BanknoteArrowDown size={20}/></span><div><h2 className="font-bold">รับชำระเงิน</h2><p className="text-xs text-slate-500">เลือกบิล ตรวจสอบยอด แล้วบันทึกการรับเงิน</p></div></div>
    <form action={action} className="p-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">ใบแจ้งหนี้<select name="invoiceId" value={selected} onChange={(event) => { const next = invoices.find((invoice) => invoice.id === event.target.value); setSelected(event.target.value); setAmount(next?.outstanding ?? 0); }} className={field}>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · ห้อง {invoice.room_number} · คงเหลือ {invoice.outstanding.toLocaleString("th-TH")} บาท</option>)}</select></label>
          <label className="text-sm font-medium">ยอดรับชำระ<input name="amount" type="number" min="0.01" max={current?.outstanding} step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value))} required className={field}/>{current && <span className="mt-1.5 flex justify-between text-xs text-slate-500"><span>สูงสุด {current.outstanding.toLocaleString("th-TH")} บาท</span><button type="button" onClick={() => setAmount(current.outstanding)} className="font-medium text-teal-700">เต็มจำนวน</button></span>}</label>
          <label className="text-sm font-medium">วันและเวลารับชำระ<input name="paidAt" type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required className={field}/></label>
          <label className="text-sm font-medium">วิธีชำระ<select name="method" value={method} onChange={(event) => setMethod(event.target.value)} className={field}><option value="cash">เงินสด</option><option value="transfer">โอนเงิน</option><option value="qr">QR Code</option></select></label>
          <label className="text-sm font-medium">เลขอ้างอิง <span className="font-normal text-slate-400">(ถ้ามี)</span><input name="reference" placeholder={method === "cash" ? "เช่น เลขที่สมุดรับเงิน" : "เช่น เลขรายการโอน"} className={field}/></label><label className="text-sm font-medium sm:col-span-2">แนบสลิปหรือหลักฐาน <span className="font-normal text-slate-400">(ไม่บังคับ · สูงสุด 5 MB)</span><span className="mt-1.5 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600"><Paperclip size={17} className="text-teal-600"/><input name="slip" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="min-h-0 flex-1 border-0 bg-transparent p-0 text-xs"/></span></label>
        </div>
        {current && <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">สรุปบิลที่เลือก</p><ReceiptText size={18} className="text-teal-600"/></div><h3 className="mt-3 text-lg font-bold">{current.invoice_number}</h3><p className="mt-1 text-sm text-slate-600">ห้อง {current.room_number} · {current.tenant_name}</p><dl className="mt-5 space-y-3 text-sm"><div className="flex items-center justify-between"><dt className="flex items-center gap-2 text-slate-500"><CircleDollarSign size={15}/>ยอดบิล</dt><dd className="font-medium">฿{current.total_amount.toLocaleString("th-TH")}</dd></div><div className="flex items-center justify-between"><dt className="flex items-center gap-2 text-slate-500"><CalendarDays size={15}/>ครบกำหนด</dt><dd className="font-medium">{new Date(`${current.due_date}T00:00:00`).toLocaleDateString("th-TH")}</dd></div><div className="flex items-center justify-between border-t border-slate-200 pt-3"><dt className="flex items-center gap-2 font-medium text-amber-800"><CreditCard size={15}/>ยอดคงเหลือ</dt><dd className="text-lg font-bold text-amber-800">฿{current.outstanding.toLocaleString("th-TH")}</dd></div></dl></aside>}
      </div>
      {invalidAmount && amount > 0 && current && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">ยอดรับชำระต้องไม่เกิน {current.outstanding.toLocaleString("th-TH")} บาท</p>}
      {state.error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>}
      {state.success && <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700">{state.success}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><p className="text-xs text-slate-500">ระบบจะปิดบิลให้อัตโนมัติเมื่อชำระครบ</p><button disabled={pending || invalidAmount} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-teal-400"><BanknoteArrowDown size={17}/>{pending ? "กำลังบันทึก..." : `ยืนยันรับชำระ ${amount > 0 ? `${amount.toLocaleString("th-TH")} บาท` : ""}`}</button></div>
    </form>
  </section>;
}