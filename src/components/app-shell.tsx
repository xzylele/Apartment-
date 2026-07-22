"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BarChart3, BellRing, Building2, CalendarCheck2, Droplets, FileClock, FileText, Gauge, LayoutDashboard, Menu, Megaphone, ReceiptText, Settings, Users, Wallet, Wrench, X } from "lucide-react";

type Role = "owner" | "staff" | "tenant" | null;
type NavItem = readonly [string, string, typeof LayoutDashboard];
const publicPages = ["/", "/login", "/forgot-password", "/reset-password", "/auth/callback"];
const mainItems: readonly NavItem[] = [
  ["/dashboard", "ภาพรวม", LayoutDashboard],
  ["/monthly-workflow", "งานประจำเดือน", CalendarCheck2],
  ["/rooms", "ห้องพัก", Building2],
  ["/tenants", "ผู้เช่า", Users],
  ["/leases", "สัญญาเช่า", FileText],
  ["/meters", "จดมิเตอร์", Gauge],
  ["/invoices", "ใบแจ้งหนี้", ReceiptText],
  ["/payments", "รับชำระเงิน", Wallet],
];
const operationItems: readonly NavItem[] = [
  ["/maintenance", "แจ้งซ่อม", Wrench],
  ["/expenses", "รายจ่าย", Wallet],
  ["/announcements", "ประกาศ", Megaphone],
  ["/alerts", "การแจ้งเตือน", BellRing],
];
const ownerItems: readonly NavItem[] = [
  ["/reports", "รายงาน", BarChart3],
  ["/utilities", "ต้นทุนค่าน้ำ–ค่าไฟ", Droplets],
  ["/audit-logs", "ประวัติการทำรายการ", FileClock],
  ["/settings", "ตั้งค่าระบบ", Settings],
];

export function AppShell({ children, role }: { children: ReactNode; role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const isPublic = publicPages.some((page) => pathname === page || pathname.startsWith(`${page}/`));
  if (isPublic || role === "tenant") return <>{children}</>;

  const canSeeTenants = role === "owner";
  const primary = mainItems.filter(([href]) => canSeeTenants || href !== "/tenants");
  const groups = [
    ["จัดการประจำวัน", primary],
    ["งานอาคาร", operationItems],
    ...(role === "owner" ? [["บริหารและตั้งค่า", ownerItems] as const] : []),
  ] as const;
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  const navigation = <nav aria-label="เมนูหลัก" className="space-y-6">{groups.map(([title, items]) => <div key={title}><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.12em] text-slate-400">{title}</p><div className="space-y-1">{items.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive(href) ? "bg-teal-600 text-white shadow-[0_8px_20px_-10px_rgba(13,148,136,.9)]" : "text-slate-600 hover:bg-teal-50 hover:text-teal-800"}`}><span className={`grid h-8 w-8 place-items-center rounded-lg transition ${isActive(href) ? "bg-white/15" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-teal-700"}`}><Icon size={17} /></span><span>{label}</span></Link>)}</div></div>)}</nav>;
  const mobileLinks = [...primary, ...operationItems].filter(([href]) => ["/dashboard", "/monthly-workflow", "/rooms", "/invoices", "/payments"].includes(href));
  const roleLabel = role === "owner" ? "เจ้าของ" : "พนักงาน";

  return <div className="owner-app min-h-screen lg:pl-72">
    <aside className="owner-sidebar fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-100 p-5"><Link href="/dashboard" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-600/20"><Building2 size={21} /></span><span className="min-w-0"><b className="block truncate text-[15px]">Apartment</b><small className="mt-0.5 block text-slate-500">ระบบจัดการอพาร์ตเมนต์</small></span></Link><span className="mt-4 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">บัญชี{roleLabel}</span></div>
      <div className="flex-1 overflow-y-auto px-4 py-5">{navigation}</div>
      <div className="border-t border-slate-100 p-4"><div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-xs font-medium text-slate-700">พร้อมใช้งาน</p><p className="mt-1 text-[11px] leading-4 text-slate-500">ข้อมูลทุกหน้าจะเชื่อมโยงกับระบบส่วนกลาง</p></div></div>
    </aside>
    <header className="owner-mobile-header sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden"><div className="flex items-center gap-2.5"><button aria-label="เปิดเมนู" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"><Menu size={20} /></button><Link href="/dashboard" className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white"><Building2 size={17} /></span><span>Home Apartment</span></Link></div><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{roleLabel}</span></header>
    {open && <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><aside role="dialog" aria-modal="true" aria-label="เมนูระบบ" className="h-full w-[min(88vw,340px)] overflow-y-auto bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-7 flex items-center justify-between"><div><b>เมนูระบบ</b><p className="text-xs text-slate-500">บัญชี{roleLabel}</p></div><button aria-label="ปิดเมนู" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><X size={19} /></button></div>{navigation}</aside></div>}
    <div className="pb-24 lg:pb-0">{children}</div>
    <nav aria-label="เมนูด่วน" className="owner-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 px-1 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_-18px_rgba(15,23,42,.4)] backdrop-blur-xl lg:hidden">{mobileLinks.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${isActive(href) ? "text-teal-700" : "text-slate-500"}`}><span className={`grid h-7 w-9 place-items-center rounded-full ${isActive(href) ? "bg-teal-100" : ""}`}><Icon size={18} /></span><span className="truncate">{label}</span></Link>)}</nav>
  </div>;
}