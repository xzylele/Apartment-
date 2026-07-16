import { BanknoteArrowDown, CalendarCheck2, ChevronLeft, CircleDollarSign, Clock3, ReceiptText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "./payment-form";
import { PaymentFilter } from "./payment-filter";
import { PaymentActions } from "./payment-actions";

type Payment = { id: string; invoice_id: string; amount: number; paid_at: string; method: string; reference: string | null; slip_path: string | null; slip_url: string | null; invoice_number: string; room_number: string; tenant_name: string };
const methodLabel: Record<string, string> = { cash: "เงินสด", transfer: "โอนเงิน", qr: "QR Code" };
const methodStyle: Record<string, string> = { cash: "bg-emerald-50 text-emerald-700", transfer: "bg-blue-50 text-blue-700", qr: "bg-violet-50 text-violet-700" };
const money = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) redirect("/dashboard");

  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthDate = new Date(`${monthStart}T00:00:00+07:00`); nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(nextMonthDate);

  const [invoicesResult, allPaymentsResult, recentPaymentsResult, monthPaymentsResult] = await Promise.all([
    supabase.from("invoices").select("id,invoice_number,total_amount,due_date,rooms(room_number),leases!invoices_lease_id_fkey(profiles!leases_tenant_id_fkey(full_name))").in("status", ["issued", "overdue"]).order("due_date"),
    supabase.from("payments").select("invoice_id,amount"),
    supabase.from("payments").select("id,invoice_id,amount,paid_at,method,reference,slip_path,invoices(invoice_number,rooms(room_number),leases!invoices_lease_id_fkey(profiles!leases_tenant_id_fkey(full_name)))").order("paid_at", { ascending: false }).limit(100),
    supabase.from("payments").select("amount,paid_at").gte("paid_at", `${monthStart}T00:00:00+07:00`).lt("paid_at", `${nextMonth}T00:00:00+07:00`),
  ]);

  const paidByInvoice = new Map<string, number>();
  (allPaymentsResult.data ?? []).forEach((payment) => paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount)));
  const invoiceOptions = (invoicesResult.data ?? []).map((invoice: any) => ({ id: invoice.id, invoice_number: invoice.invoice_number, total_amount: Number(invoice.total_amount), due_date: invoice.due_date, room_number: invoice.rooms?.room_number ?? "-", tenant_name: invoice.leases?.profiles?.full_name ?? "ไม่ระบุผู้เช่า", outstanding: Math.max(0, Number(invoice.total_amount) - (paidByInvoice.get(invoice.id) ?? 0)) })).filter((invoice) => invoice.outstanding > 0);
  const payments = (recentPaymentsResult.data ?? []).map((payment: any) => ({ id: payment.id, invoice_id: payment.invoice_id, amount: Number(payment.amount), paid_at: payment.paid_at, method: payment.method, reference: payment.reference, slip_path: payment.slip_path, slip_url: null, invoice_number: payment.invoices?.invoice_number ?? "-", room_number: payment.invoices?.rooms?.room_number ?? "-", tenant_name: payment.invoices?.leases?.profiles?.full_name ?? "ไม่ระบุผู้เช่า" })) as Payment[];
  const paymentsWithSlips = await Promise.all(payments.map(async (payment) => { if (!payment.slip_path) return payment; const { data } = await supabase.storage.from("payment-slips").createSignedUrl(payment.slip_path, 60 * 60); return { ...payment, slip_url: data?.signedUrl ?? null }; }));
  const monthPayments = monthPaymentsResult.data ?? [];
  const monthTotal = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const todayPayments = monthPayments.filter((payment) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(payment.paid_at)) === today);
  const todayTotal = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstandingTotal = invoiceOptions.reduce((sum, invoice) => sum + invoice.outstanding, 0);

  return <main className="min-h-screen"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={20}/></Link><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white"><BanknoteArrowDown size={20}/></span><div><h1 className="font-bold">รับชำระเงิน</h1><p className="text-xs text-slate-500">บันทึกการรับเงิน ตรวจสอบยอดคงเหลือ และออกใบเสร็จ</p></div></div></header>
    <section className="mx-auto max-w-7xl px-5 py-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl bg-white p-5"><CalendarCheck2 className="text-teal-600" size={21}/><p className="mt-3 text-sm text-slate-500">รับวันนี้</p><p className="mt-1 text-2xl font-bold text-teal-700">{money(todayTotal)}</p><p className="mt-1 text-xs text-slate-500">{todayPayments.length} รายการ</p></article><article className="rounded-2xl bg-white p-5"><CircleDollarSign className="text-emerald-600" size={21}/><p className="mt-3 text-sm text-slate-500">รับเดือนนี้</p><p className="mt-1 text-2xl font-bold">{money(monthTotal)}</p><p className="mt-1 text-xs text-slate-500">{monthPayments.length} รายการ</p></article><article className="rounded-2xl bg-white p-5"><Clock3 className="text-amber-600" size={21}/><p className="mt-3 text-sm text-slate-500">ยอดที่ยังต้องรับ</p><p className="mt-1 text-2xl font-bold text-amber-800">{money(outstandingTotal)}</p><p className="mt-1 text-xs text-slate-500">{invoiceOptions.length} ใบแจ้งหนี้</p></article><article className="rounded-2xl bg-white p-5"><ReceiptText className="text-blue-600" size={21}/><p className="mt-3 text-sm text-slate-500">ประวัติล่าสุด</p><p className="mt-1 text-2xl font-bold">{payments.length}</p><p className="mt-1 text-xs text-slate-500">แสดงสูงสุด 100 รายการ</p></article></div>

      <div className="mt-6"><PaymentForm invoices={invoiceOptions}/></div>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">ประวัติการรับชำระ</h2><p className="text-xs text-slate-500">ค้นหารายการและเปิดใบเสร็จย้อนหลัง</p></div></div><PaymentFilter total={payments.length}/>{payments.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="px-5 py-3">วันที่รับชำระ</th><th className="px-5 py-3">บิล / ห้อง / ผู้เช่า</th><th className="px-5 py-3">วิธีชำระ</th><th className="px-5 py-3">เลขอ้างอิง</th><th className="px-5 py-3 text-right">จำนวนเงิน</th><th className="px-5 py-3">หลักฐาน / จัดการ</th></tr></thead><tbody>{paymentsWithSlips.map((payment) => { const paymentDate = new Date(payment.paid_at); const paymentMonth = new Date(paymentDate.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7); return <tr key={payment.id} data-payment-row data-payment={`${payment.invoice_number} ${payment.room_number} ${payment.tenant_name} ${payment.reference ?? ""}`.toLowerCase()} data-month={paymentMonth} data-method={payment.method} className="border-t border-slate-100"><td className="whitespace-nowrap px-5 py-4"><p className="font-medium">{paymentDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}</p><p className="mt-0.5 text-xs text-slate-500">{paymentDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })} น.</p></td><td className="px-5 py-4"><p className="font-semibold">{payment.invoice_number}</p><p className="mt-0.5 text-xs text-slate-500">ห้อง {payment.room_number} · {payment.tenant_name}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${methodStyle[payment.method] ?? "bg-slate-100 text-slate-700"}`}>{methodLabel[payment.method] ?? payment.method}</span></td><td className="px-5 py-4 text-slate-600">{payment.reference || "-"}</td><td className="whitespace-nowrap px-5 py-4 text-right font-bold text-teal-700">{money(payment.amount)}</td><td className="px-5 py-4"><div className="flex items-center justify-end gap-2"><Link href={`/receipts/${payment.id}`} className="inline-flex whitespace-nowrap rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">ใบเสร็จ</Link><PaymentActions payment={payment}/></div></td></tr>; })}</tbody></table></div> : <div className="p-12 text-center"><ReceiptText className="mx-auto text-slate-300"/><p className="mt-3 font-medium">ยังไม่มีประวัติรับชำระ</p><p className="mt-1 text-sm text-slate-500">รายการที่บันทึกสำเร็จจะแสดงที่นี่</p></div>}</section>
    </section>
  </main>;
}