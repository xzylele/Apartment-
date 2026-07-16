import { BarChart3, Building2, ChevronLeft, CircleDollarSign, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportLinks } from "@/components/export-links";

type Props = { searchParams: Promise<{ month?: string }> };
const money = (value: number) => `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : currentMonth;
  const start = `${month}-01`;
  const next = new Date(`${start}T00:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1);
  const end = next.toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") redirect("/dashboard");

  const [{ data: monthPayments = [] }, { data: monthExpenses = [] }, { data: invoices = [] }, { data: payments = [] }, { count: roomCount }, { count: occupiedCount }] = await Promise.all([
    supabase.from("payments").select("amount,paid_at").gte("paid_at", start).lt("paid_at", end),
    supabase.from("expenses").select("amount,expense_date").gte("expense_date", start).lt("expense_date", end).is("deleted_at", null),
    supabase.from("invoices").select("id,total_amount,status").neq("status", "void"),
    supabase.from("payments").select("invoice_id,amount"),
    supabase.from("rooms").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("status", "occupied").is("deleted_at", null),
  ]);
  const received = (monthPayments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const expenseTotal = (monthExpenses ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paidByInvoice = new Map<string, number>();
  (payments ?? []).forEach((payment) => paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount)));
  const outstanding = (invoices ?? []).filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total_amount) - (paidByInvoice.get(invoice.id) ?? 0)), 0);
  const occupancy = roomCount ? Math.round(((occupiedCount ?? 0) / roomCount) * 100) : 0;
  const net = received - expenseTotal;
  const stats = [[CircleDollarSign, "รายรับเดือนนี้", money(received), "text-teal-600"], [ReceiptText, "ยอดคงเหลือที่ต้องรับ", money(outstanding), "text-amber-600"], [net >= 0 ? TrendingUp : TrendingDown, "กำไร/ขาดทุนเดือนนี้", money(net), net >= 0 ? "text-blue-600" : "text-rose-600"], [Building2, "อัตราเข้าพัก", `${occupancy}%`, "text-violet-600"]] as const;

  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={20}/></Link><span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-600 text-white"><BarChart3 size={19}/></span><div><h1 className="font-bold">รายงาน</h1><p className="text-xs text-slate-500">สรุปรายรับ รายจ่าย และการเข้าพัก</p></div></div></header><section className="mx-auto max-w-6xl px-5 py-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">ภาพรวมธุรกิจ</h2><p className="text-sm text-slate-500">เลือกเดือนเพื่อดูรายรับและรายจ่ายของช่วงนั้น</p></div><div className="flex flex-wrap items-center gap-2"><form className="flex items-center gap-2"><input type="month" name="month" defaultValue={month} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/><button className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white">ดูรายงาน</button></form><ExportLinks/></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([Icon,label,value,color])=><article key={label} className="rounded-2xl bg-white p-5 shadow-sm"><Icon className={color}/><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></article>)}</div><section className="mt-6 grid gap-4 lg:grid-cols-2"><article className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="font-bold">สรุปเงินเดือน {month}</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">รายรับที่บันทึกรับชำระแล้ว</dt><dd className="font-semibold text-teal-700">{money(received)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">รายจ่ายที่บันทึกแล้ว</dt><dd className="font-semibold text-rose-700">{money(expenseTotal)}</dd></div><div className="flex justify-between border-t pt-4"><dt className="font-semibold">กำไร/ขาดทุนสุทธิ</dt><dd className={net >= 0 ? "font-bold text-blue-700" : "font-bold text-rose-700"}>{money(net)}</dd></div></dl></article><article className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="font-bold">สถานะห้องพัก</h2><div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{width:`${occupancy}%`}}/></div><div className="mt-3 flex justify-between text-sm"><span>มีผู้เช่า {occupiedCount ?? 0} ห้อง</span><span className="text-slate-500">ทั้งหมด {roomCount ?? 0} ห้อง</span></div><div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="text-sm text-amber-900">ยอดคงเหลือที่ต้องรับ</p><p className="mt-1 text-xl font-bold text-amber-900">{money(outstanding)}</p><p className="mt-1 text-xs text-amber-800">คำนวณจากยอดบิลหักรายการที่รับชำระแล้ว</p></div></article></section></section></main>;
}