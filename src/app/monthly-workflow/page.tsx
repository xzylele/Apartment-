import { ArrowLeft, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck, FilePlus2, Gauge, ReceiptText, Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MonthlyRoomList, type MonthlyRoomItem } from "./monthly-room-list";

type Props = { searchParams: Promise<{ month?: string }> };
const money = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const nextMonth = (month: string) => { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 7); };

export default async function MonthlyWorkflowPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date());
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : currentMonth;
  const start = `${month}-01`, endMonth = nextMonth(month), end = `${endMonth}-01`;
  const lastDayDate = new Date(`${end}T00:00:00Z`); lastDayDate.setUTCDate(lastDayDate.getUTCDate() - 1); const lastDay = lastDayDate.toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) redirect("/dashboard");

  const [leasesResult, metersResult, invoicesResult] = await Promise.all([
    supabase.from("leases").select("id,room_id,start_date,end_date,rooms(room_number),profiles!leases_tenant_id_fkey(full_name)").lte("start_date", lastDay).gte("end_date", start).order("start_date", { ascending: false }),
    supabase.from("meter_readings").select("room_id").eq("reading_month", start),
    supabase.from("invoices").select("id,room_id,invoice_number,total_amount,status").eq("billing_month", start),
  ]);
  const leaseByRoom = new Map<string, any>();
  (leasesResult.data ?? []).forEach((lease: any) => { if (!leaseByRoom.has(lease.room_id)) leaseByRoom.set(lease.room_id, lease); });
  const meterRooms = new Set((metersResult.data ?? []).map((reading) => reading.room_id));
  const activeInvoices = (invoicesResult.data ?? []).filter((invoice) => invoice.status !== "void");
  const invoiceByRoom = new Map(activeInvoices.map((invoice) => [invoice.room_id, invoice]));
  const invoiceIds = activeInvoices.map((invoice) => invoice.id);
  const paymentsResult = invoiceIds.length ? await supabase.from("payments").select("invoice_id,amount").in("invoice_id", invoiceIds) : { data: [], error: null };
  const paidByInvoice = new Map<string, number>();
  (paymentsResult.data ?? []).forEach((payment) => paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount)));
  const rooms = Array.from(leaseByRoom.values()).map((lease: any) => {
    const room = Array.isArray(lease.rooms) ? lease.rooms[0] : lease.rooms;
    const tenant = Array.isArray(lease.profiles) ? lease.profiles[0] : lease.profiles;
    const invoice: any = invoiceByRoom.get(lease.room_id);
    const meterDone = meterRooms.has(lease.room_id), paidAmount = invoice ? paidByInvoice.get(invoice.id) ?? 0 : 0;
    const invoiceTotal = invoice ? Number(invoice.total_amount) : 0, balance = Math.max(0, invoiceTotal - paidAmount);
    const status: MonthlyRoomItem["status"] = !meterDone ? "missing_meter" : !invoice ? "ready_invoice" : balance > 0 ? "unpaid" : "complete";
    return { roomId: lease.room_id, roomNumber: room?.room_number ?? "-", tenantName: tenant?.full_name ?? "ไม่ระบุผู้เช่า", meterDone, invoiceId: invoice?.id ?? null, invoiceNumber: invoice?.invoice_number ?? null, invoiceTotal, paidAmount, balance, status };
  }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, "th", { numeric: true })) as MonthlyRoomItem[];
  const meterDone = rooms.filter((room) => room.meterDone).length, invoiceDone = rooms.filter((room) => room.invoiceId).length, paidDone = rooms.filter((room) => room.status === "complete").length;
  const billedTotal = rooms.reduce((sum, room) => sum + room.invoiceTotal, 0), receivedTotal = rooms.reduce((sum, room) => sum + room.paidAmount, 0), balanceTotal = rooms.reduce((sum, room) => sum + room.balance, 0);
  const totalActions = rooms.length * 3, completedActions = meterDone + invoiceDone + paidDone, progress = totalActions ? Math.round(completedActions / totalActions * 100) : 0;
  const readyToClose = rooms.length > 0 && rooms.every((room) => room.status === "complete");
  const hasError = leasesResult.error || metersResult.error || invoicesResult.error || paymentsResult.error;
  const monthLabel = new Date(`${start}T00:00:00Z`).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const steps = [
    { label: "จดมิเตอร์", done: meterDone, total: rooms.length, detail: rooms.length - meterDone ? `เหลือ ${rooms.length - meterDone} ห้อง` : "จดครบแล้ว", href: "/meters", icon: Gauge, tone: "blue" },
    { label: "ออกใบแจ้งหนี้", done: invoiceDone, total: rooms.length, detail: rooms.filter((room) => room.status === "ready_invoice").length ? `พร้อมออก ${rooms.filter((room) => room.status === "ready_invoice").length} ห้อง` : "ไม่มีห้องรอออกบิล", href: "/invoices", icon: FilePlus2, tone: "amber" },
    { label: "รับชำระเงิน", done: paidDone, total: rooms.length, detail: balanceTotal ? `คงเหลือ ${money(balanceTotal)}` : "รับชำระครบแล้ว", href: "/payments", icon: Wallet, tone: "teal" },
  ] as const;
  const tones = { blue: "bg-blue-50 text-blue-700 border-blue-100", amber: "bg-amber-50 text-amber-700 border-amber-100", teal: "bg-teal-50 text-teal-700 border-teal-100" };

  return <main className="min-h-screen"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ArrowLeft size={20}/></Link><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white"><ClipboardCheck size={20}/></span><div><h1 className="font-bold">งานประจำเดือน</h1><p className="text-xs text-slate-500">ตรวจความครบตั้งแต่จดมิเตอร์จนถึงรับชำระ</p></div></div></header><section className="mx-auto max-w-7xl px-5 py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-slate-500">รอบที่กำลังดู</p><h2 className="mt-1 text-2xl font-bold">{monthLabel}</h2><p className="mt-1 text-sm text-slate-500">{rooms.length} ห้องที่มีสัญญาเช่าในรอบนี้</p></div><form className="flex items-end gap-2 rounded-2xl border bg-white p-3"><label className="text-xs font-medium text-slate-500">เลือกเดือน<input type="month" name="month" defaultValue={month} className="mt-1 block rounded-xl border px-3 py-2 text-sm"/></label><button className="h-10 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white">ดูรอบเดือน</button></form></div>
    {hasError && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาตรวจสอบฐานข้อมูลก่อนดำเนินการ</div>}
    <section className={`mt-6 rounded-2xl border p-5 ${readyToClose ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-start gap-3">{readyToClose ? <CheckCircle2 className="mt-0.5 text-teal-600"/> : <ClipboardCheck className="mt-0.5 text-slate-500"/>}<div><h3 className="font-bold">{readyToClose ? "รอบเดือนนี้ดำเนินการครบแล้ว" : "ความคืบหน้ารอบเดือน"}</h3><p className="mt-1 text-sm text-slate-600">{completedActions} จาก {totalActions} ขั้นตอนย่อย · {progress}%</p></div></div><span className={`rounded-full px-3 py-1.5 text-sm font-medium ${readyToClose ? "bg-white text-teal-700" : "bg-slate-100 text-slate-600"}`}>{readyToClose ? "พร้อมปิดรอบ" : "กำลังดำเนินการ"}</span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }}/></div></section>
    <div className="mt-5 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-white p-5"><ReceiptText className="text-slate-600" size={21}/><p className="mt-3 text-sm text-slate-500">ยอดออกบิล</p><p className="mt-1 text-2xl font-bold">{money(billedTotal)}</p><p className="text-xs text-slate-500">{invoiceDone} ใบแจ้งหนี้</p></article><article className="rounded-2xl border-teal-100 bg-teal-50/60 p-5"><CircleDollarSign className="text-teal-600" size={21}/><p className="mt-3 text-sm text-teal-700">รับชำระแล้ว</p><p className="mt-1 text-2xl font-bold text-teal-900">{money(receivedTotal)}</p><p className="text-xs text-teal-700">ชำระครบ {paidDone} ห้อง</p></article><article className="rounded-2xl border-amber-100 bg-amber-50/60 p-5"><Wallet className="text-amber-600" size={21}/><p className="mt-3 text-sm text-amber-700">ยอดคงเหลือ</p><p className="mt-1 text-2xl font-bold text-amber-900">{money(balanceTotal)}</p><p className="text-xs text-amber-700">รอชำระ {rooms.filter((room) => room.status === "unpaid").length} ห้อง</p></article></div>
    <section className="mt-6 grid gap-4 lg:grid-cols-3">{steps.map((step, index) => <Link href={step.href} key={step.label} className={`rounded-2xl border p-5 ${tones[step.tone]}`}><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white"><step.icon size={19}/></span><span className="text-xs font-semibold">ขั้นตอน {index + 1}</span></div><h3 className="mt-4 font-bold">{step.label}</h3><p className="mt-1 text-2xl font-bold">{step.done}/{step.total} ห้อง</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-current" style={{ width: `${step.total ? Math.round(step.done / step.total * 100) : 0}%` }}/></div><div className="mt-3 flex items-center justify-between text-xs"><span>{step.detail}</span><ChevronRight size={15}/></div></Link>)}</section>
    <MonthlyRoomList rooms={rooms}/>
  </section></main>;
}
