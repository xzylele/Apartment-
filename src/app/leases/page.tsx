import { ChevronLeft, FileText, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeaseForm } from "./lease-form";
import { LeaseActions } from "./lease-actions";
import { RenewMoveOutActions } from "./renew-moveout-actions";

type Lease = { id: string; tenant_id: string; start_date: string; end_date: string; rent_amount: number; deposit_amount: number; active: boolean; rooms: { room_number: string } | null; profiles: { full_name: string } | null };

export default async function LeasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) redirect("/dashboard");
  const [leasesResult, roomsResult, tenantsResult] = await Promise.all([
    supabase.from("leases").select("id,tenant_id,start_date,end_date,rent_amount,deposit_amount,active,rooms(room_number),profiles!leases_tenant_id_fkey(full_name)").order("created_at", { ascending: false }),
    supabase.from("rooms").select("id,room_number,monthly_rent,deposit").eq("status", "vacant").is("deleted_at", null).order("room_number"),
    supabase.from("profiles").select("id,full_name").eq("role", "tenant").order("full_name"),
  ]);
  const leases = (leasesResult.data ?? []) as unknown as Lease[];
  const activeLeaseByTenant = new Map(leases.filter((lease) => lease.active).map((lease) => [lease.tenant_id, { roomNumber: lease.rooms?.room_number ?? "-", endDate: lease.end_date }]));
  const tenants = (tenantsResult.data ?? []).map((tenant) => ({ ...tenant, activeLease: activeLeaseByTenant.get(tenant.id) ?? null }));
  const activeCount = leases.filter((lease) => lease.active).length;

  return <main className="min-h-screen"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={20}/></Link><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white"><FileText size={20}/></span><div><h1 className="font-bold">สัญญาเช่า</h1><p className="text-xs text-slate-500">จัดการการเข้าพัก ระยะสัญญา และการย้ายออก</p></div></div></header><section className="mx-auto max-w-7xl px-5 py-8"><div className="grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-white p-5"><FileText className="text-teal-600"/><p className="mt-3 text-sm text-slate-500">สัญญาทั้งหมด</p><p className="text-2xl font-bold">{leases.length}</p></article><article className="rounded-2xl bg-white p-5"><Home className="text-blue-600"/><p className="mt-3 text-sm text-slate-500">สัญญาที่ใช้งาน</p><p className="text-2xl font-bold">{activeCount}</p></article><article className="rounded-2xl bg-white p-5"><UserRound className="text-violet-600"/><p className="mt-3 text-sm text-slate-500">ห้องว่างพร้อมทำสัญญา</p><p className="text-2xl font-bold">{roomsResult.data?.length ?? 0}</p></article></div><div className="mt-6"><LeaseForm rooms={roomsResult.data ?? []} tenants={tenants}/></div><section className="mt-6 overflow-hidden rounded-2xl bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">รายการสัญญา</h2><p className="mt-1 text-xs text-slate-500">ผู้เช่าที่มีสัญญาใช้งานอยู่จะไม่สามารถสร้างสัญญาซ้ำได้</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="px-5 py-3">ห้อง</th><th className="px-5 py-3">ผู้เช่า</th><th className="px-5 py-3">ระยะสัญญา</th><th className="px-5 py-3">ค่าเช่า</th><th className="px-5 py-3">สถานะ</th><th className="px-5 py-3"></th></tr></thead><tbody>{leases.map((lease) => <tr key={lease.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{lease.rooms?.room_number || "-"}</td><td className="px-5 py-4">{lease.profiles?.full_name || "-"}</td><td className="whitespace-nowrap px-5 py-4">{lease.start_date} – {lease.end_date}</td><td className="px-5 py-4">฿{Number(lease.rent_amount).toLocaleString("th-TH")}</td><td className="px-5 py-4">{lease.active ? <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">ใช้งาน</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">สิ้นสุด</span>}</td><td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2">{lease.active && <><LeaseActions lease={lease}/><RenewMoveOutActions lease={lease}/></>}</div></td></tr>)}</tbody></table>{!leases.length && <p className="p-8 text-center text-sm text-slate-500">ยังไม่มีสัญญาเช่า</p>}</div></section></section></main>;
}