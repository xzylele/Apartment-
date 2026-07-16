import { AlertTriangle, ArrowRight, BanknoteArrowDown, Building2, CalendarClock, CircleDollarSign, FilePlus2, Gauge, LogOut, ReceiptText, TrendingDown, TrendingUp, Wallet, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

type InvoiceRow = { id: string; invoice_number: string; due_date: string; total_amount: number; rooms: { room_number: string } | null };
type LeaseRow = { id: string; end_date: string; rooms: { room_number: string } | null; profiles: { full_name: string } | null };
type MaintenanceRow = { id: string; title: string; priority: number; status: string; scheduled_date: string; rooms: { room_number: string } | null };

const money = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const shortDate = (value: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T00:00:00+07:00`));

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  if (profile?.role === "tenant") redirect("/my-account");
  if (!profile || !["owner", "staff"].includes(profile.role)) redirect("/login");

  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthDate = new Date(`${monthStart}T00:00:00+07:00`);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(nextMonthDate);
  const next30Date = new Date(`${today}T00:00:00+07:00`);
  next30Date.setDate(next30Date.getDate() + 30);
  const next30 = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(next30Date);

  const [roomsResult, leasesResult, invoicesResult, paymentsResult, monthPaymentsResult, expensesResult, metersResult, maintenanceCountResult, maintenanceResult] = await Promise.all([
    supabase.from("rooms").select("id,status").is("deleted_at", null),
    supabase.from("leases").select("id,end_date,rooms(room_number),profiles!leases_tenant_id_fkey(full_name)").eq("active", true).order("end_date"),
    supabase.from("invoices").select("id,invoice_number,due_date,total_amount,rooms(room_number)").in("status", ["issued", "overdue"]).order("due_date"),
    supabase.from("payments").select("invoice_id,amount"),
    supabase.from("payments").select("amount").gte("paid_at", `${monthStart}T00:00:00+07:00`).lt("paid_at", `${nextMonth}T00:00:00+07:00`),
    supabase.from("expenses").select("amount").gte("expense_date", monthStart).lt("expense_date", nextMonth).is("deleted_at", null),
    supabase.from("meter_readings").select("room_id").gte("reading_month", monthStart).lt("reading_month", nextMonth),
    supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("maintenance_requests").select("id,title,priority,status,scheduled_date,rooms(room_number)").in("status", ["open", "in_progress"]).order("priority").order("scheduled_date").limit(20),
  ]);

  const rooms = roomsResult.data ?? [];
  const leases = (leasesResult.data ?? []) as unknown as LeaseRow[];
  const invoiceRows = (invoicesResult.data ?? []) as unknown as InvoiceRow[];
  const maintenance = (maintenanceResult.data ?? []) as unknown as MaintenanceRow[];
  const occupiedRooms = rooms.filter((room) => room.status === "occupied");
  const vacantRooms = rooms.filter((room) => room.status === "vacant").length;
  const meteredRooms = new Set((metersResult.data ?? []).map((reading) => reading.room_id));
  const missingMeters = occupiedRooms.filter((room) => !meteredRooms.has(room.id)).length;
  const expiringLeases = leases.filter((lease) => lease.end_date >= today && lease.end_date <= next30);

  const paidByInvoice = new Map<string, number>();
  (paymentsResult.data ?? []).forEach((payment) => paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount)));
  const invoices = invoiceRows.map((invoice) => ({ ...invoice, balance: Math.max(0, Number(invoice.total_amount) - (paidByInvoice.get(invoice.id) ?? 0)) })).filter((invoice) => invoice.balance > 0);
  const overdueInvoices = invoices.filter((invoice) => invoice.due_date < today);
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const income = (monthPaymentsResult.data ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const expenses = (expensesResult.data ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0);
  const net = income - expenses;
  const occupancy = rooms.length ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0;
  const openJobs = maintenanceCountResult.count ?? 0;
  const urgentCount = overdueInvoices.length + missingMeters + expiringLeases.length + openJobs;
  const name = profile.full_name || user.email || "ผู้ใช้งาน";
  const role = profile.role === "owner" ? "เจ้าของ" : "พนักงาน";

  const tasks = [
    { label: "บิลเกินกำหนด", value: overdueInvoices.length, detail: money(overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0)), href: "/invoices", tone: "rose" },
    { label: "ยังไม่จดมิเตอร์เดือนนี้", value: missingMeters, detail: `จากห้องที่มีผู้เช่า ${occupiedRooms.length} ห้อง`, href: "/meters", tone: "amber" },
    { label: "สัญญาหมดใน 30 วัน", value: expiringLeases.length, detail: expiringLeases[0] ? `เร็วที่สุด ${shortDate(expiringLeases[0].end_date)}` : "ไม่มีสัญญาใกล้หมด", href: "/leases", tone: "violet" },
    { label: "งานซ่อมคงค้าง", value: openJobs, detail: maintenance.filter((item) => item.priority === 1).length ? `เร่งด่วน ${maintenance.filter((item) => item.priority === 1).length} งาน` : "ไม่มีงานเร่งด่วน", href: "/maintenance", tone: "blue" },
  ] as const;
  const tones = { rose: "border-rose-100 bg-rose-50 text-rose-800", amber: "border-amber-100 bg-amber-50 text-amber-800", violet: "border-violet-100 bg-violet-50 text-violet-800", blue: "border-blue-100 bg-blue-50 text-blue-800" };
  const quickActions = [
    ["/rooms", "เพิ่มห้อง", Building2], ["/leases", "ทำสัญญา", FilePlus2], ["/meters", "จดมิเตอร์", Gauge], ["/invoices", "ออกใบแจ้งหนี้", ReceiptText], ["/payments", "รับชำระเงิน", BanknoteArrowDown], ["/expenses", "บันทึกรายจ่าย", Wallet],
  ] as const;

  return <main className="min-h-screen">
    <header className="sticky top-0 z-10 border-b"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><div><p className="text-xs font-medium text-teal-700">ภาพรวมการบริหาร</p><h1 className="mt-0.5 font-bold">Dashboard</h1></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium">{name}</p><p className="text-xs text-slate-500">{role}</p></div><form action={logout}><button title="ออกจากระบบ" aria-label="ออกจากระบบ" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-rose-600"><LogOut size={18}/></button></form></div></div></header>

    <section className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-500">{new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" }).format(now)}</p><h2 className="mt-1 text-2xl font-bold tracking-tight">สวัสดี, {name}</h2><p className="mt-1 text-sm text-slate-500">นี่คือสถานะล่าสุดของอพาร์ตเมนต์ที่ต้องดูแล</p></div>{urgentCount > 0 ? <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"><AlertTriangle size={16}/>{urgentCount} รายการที่ควรตรวจสอบ</span> : <span className="rounded-full bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700">ไม่มีงานเร่งด่วน</span>}</div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/rooms" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Building2 size={20}/></span><ArrowRight size={17} className="text-slate-300"/></div><p className="mt-4 text-sm text-slate-500">การเข้าพัก</p><p className="mt-1 text-2xl font-bold">{occupiedRooms.length}/{rooms.length} ห้อง</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${occupancy}%` }}/></div><p className="mt-2 text-xs text-slate-500">เข้าพัก {occupancy}% · ว่าง {vacantRooms} ห้อง</p></Link>
        <Link href="/payments" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><TrendingUp size={20}/></span><ArrowRight size={17} className="text-slate-300"/></div><p className="mt-4 text-sm text-slate-500">รายรับเดือนนี้</p><p className="mt-1 text-2xl font-bold text-emerald-700">{money(income)}</p><p className="mt-3 text-xs text-slate-500">จากรายการรับชำระที่บันทึกแล้ว</p></Link>
        <Link href="/expenses" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700"><TrendingDown size={20}/></span><ArrowRight size={17} className="text-slate-300"/></div><p className="mt-4 text-sm text-slate-500">รายจ่ายเดือนนี้</p><p className="mt-1 text-2xl font-bold text-rose-700">{money(expenses)}</p><p className="mt-3 text-xs text-slate-500">เงินสุทธิ {money(net)}</p></Link>
        <Link href="/invoices" className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-amber-700"><CircleDollarSign size={20}/></span><ArrowRight size={17} className="text-amber-400"/></div><p className="mt-4 text-sm text-amber-800">ยอดคงเหลือที่ต้องรับ</p><p className="mt-1 text-2xl font-bold text-amber-900">{money(outstanding)}</p><p className="mt-3 text-xs text-amber-800">{invoices.length} บิล · เกินกำหนด {overdueInvoices.length}</p></Link>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold">งานที่ต้องติดตาม</h3><p className="text-xs text-slate-500">เรียงจากข้อมูลที่มีผลต่อการดำเนินงาน</p></div><Link href="/alerts" className="text-sm font-medium text-teal-700">ดูศูนย์แจ้งเตือน</Link></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{tasks.map((task) => <Link href={task.href} key={task.label} className={`rounded-xl border p-4 ${tones[task.tone]} hover:-translate-y-0.5`}><div className="flex items-center justify-between"><p className="text-sm font-medium">{task.label}</p><ArrowRight size={15}/></div><p className="mt-3 text-2xl font-bold">{task.value}</p><p className="mt-1 text-xs opacity-80">{task.detail}</p></Link>)}</div></section>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="overflow-hidden rounded-2xl bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold">บิลที่ควรติดตาม</h3><p className="text-xs text-slate-500">แสดงยอดคงเหลือหลังหักยอดที่ชำระแล้ว</p></div><Link href="/invoices" className="text-sm font-medium text-teal-700">ดูทั้งหมด</Link></div>{invoices.length ? <div className="divide-y divide-slate-100">{invoices.slice(0, 5).map((invoice) => <Link href="/invoices" key={invoice.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{invoice.invoice_number}</p>{invoice.due_date < today && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">เกินกำหนด</span>}</div><p className="mt-1 text-xs text-slate-500">ห้อง {invoice.rooms?.room_number ?? "-"} · ครบกำหนด {shortDate(invoice.due_date)}</p></div><p className="shrink-0 font-bold">{money(invoice.balance)}</p></Link>)}</div> : <div className="px-5 py-10 text-center"><ReceiptText className="mx-auto text-slate-300"/><p className="mt-3 font-medium">ไม่มีบิลค้างชำระ</p><p className="mt-1 text-sm text-slate-500">บิลที่ชำระครบแล้วจะไม่แสดงในรายการนี้</p></div>}</section>

        <section className="overflow-hidden rounded-2xl bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold">งานซ่อมล่าสุด</h3><p className="text-xs text-slate-500">งานที่ยังไม่ปิด</p></div><Link href="/maintenance" className="text-sm font-medium text-teal-700">จัดการ</Link></div>{maintenance.length ? <div className="divide-y divide-slate-100">{maintenance.slice(0, 5).map((item) => <Link href="/maintenance" key={item.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.priority === 1 ? "bg-rose-500" : item.priority === 2 ? "bg-amber-400" : "bg-blue-400"}`}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">ห้อง {item.rooms?.room_number ?? "-"} · นัด {shortDate(item.scheduled_date)}</p></div><span className="text-xs text-slate-500">{item.status === "in_progress" ? "กำลังทำ" : "รอดำเนินการ"}</span></Link>)}</div> : <div className="px-5 py-10 text-center"><Wrench className="mx-auto text-slate-300"/><p className="mt-3 text-sm text-slate-500">ไม่มีงานซ่อมคงค้าง</p></div>}</section>
      </div>

      {expiringLeases.length > 0 && <section className="mt-7 overflow-hidden rounded-2xl bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><CalendarClock size={18}/></span><div><h3 className="font-bold">สัญญาใกล้หมดอายุ</h3><p className="text-xs text-slate-500">ภายใน 30 วันข้างหน้า</p></div></div><Link href="/leases" className="text-sm font-medium text-teal-700">จัดการสัญญา</Link></div><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{expiringLeases.slice(0, 6).map((lease) => <Link href="/leases" key={lease.id} className="rounded-xl border border-slate-200 p-4 hover:border-violet-200 hover:bg-violet-50/40"><div className="flex justify-between gap-3"><div><p className="font-semibold">ห้อง {lease.rooms?.room_number ?? "-"}</p><p className="mt-1 text-sm text-slate-500">{lease.profiles?.full_name ?? "ไม่ระบุผู้เช่า"}</p></div><span className="text-sm font-medium text-violet-700">{shortDate(lease.end_date)}</span></div></Link>)}</div></section>}

      <div className="mt-8"><div className="flex items-center justify-between"><div><h3 className="font-bold">ทำรายการด่วน</h3><p className="text-xs text-slate-500">ไปยังงานที่ใช้บ่อย</p></div><Link href="/reports" className="hidden text-sm font-medium text-teal-700 sm:block">ดูรายงานธุรกิจ</Link></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{quickActions.map(([href, label, Icon]) => <Link href={href} key={href} className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700"><Icon size={19}/></span><p className="mt-3 text-sm font-medium">{label}</p></Link>)}</div></div>
    </section>
  </main>;
}