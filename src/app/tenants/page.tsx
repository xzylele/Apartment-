import { ChevronLeft, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserForm } from "./user-form";
import { TenantActions } from "./tenant-actions";

type Profile = { id: string; full_name: string; phone: string | null; role: "owner" | "staff" | "tenant"; created_at: string };
const labels = { owner: "เจ้าของ", staff: "พนักงาน", tenant: "ผู้เช่า" };

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: current } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!current || !["owner", "staff"].includes(current.role)) redirect("/dashboard");
  const { data, error } = await supabase.from("profiles").select("id, full_name, phone, role, created_at").order("created_at", { ascending: false });
  const profiles = (data ?? []) as Profile[];
  const canCreate = current.role === "owner";
  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={20}/></Link><span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-600 text-white"><Users size={19}/></span><div><h1 className="font-bold">ผู้เช่าและผู้ใช้งาน</h1><p className="text-xs text-slate-500">จัดการบัญชีและบทบาทผู้ใช้งาน</p></div></div></header><section className="mx-auto max-w-6xl px-5 py-8"><div className="grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-white p-5 shadow-sm"><Users className="text-teal-600"/><p className="mt-3 text-sm text-slate-500">ผู้ใช้งานทั้งหมด</p><p className="text-2xl font-bold">{profiles.length}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><Users className="text-blue-600"/><p className="mt-3 text-sm text-slate-500">ผู้เช่า</p><p className="text-2xl font-bold">{profiles.filter((profile) => profile.role === "tenant").length}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><ShieldCheck className="text-violet-600"/><p className="mt-3 text-sm text-slate-500">พนักงาน</p><p className="text-2xl font-bold">{profiles.filter((profile) => profile.role === "staff").length}</p></article></div>{canCreate && <div className="mt-6"><UserForm/></div>}<section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-bold">รายชื่อผู้ใช้งาน</h2></div>{error ? <p className="p-5 text-sm text-red-700">ไม่สามารถโหลดข้อมูลผู้ใช้งานได้ กรุณารัน migration ล่าสุด</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">ชื่อ</th><th className="px-5 py-3 font-medium">โทรศัพท์</th><th className="px-5 py-3 font-medium">บทบาท</th><th className="px-5 py-3 font-medium">สร้างเมื่อ</th><th className="px-5 py-3 font-medium"></th></tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{profile.full_name}</td><td className="px-5 py-4">{profile.phone || "-"}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{labels[profile.role]}</span></td><td className="px-5 py-4">{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(profile.created_at))}</td><td className="px-5 py-4">{profile.role === "tenant" ? <TenantActions tenant={profile} canDelete={canCreate}/> : <span className="text-slate-300">-</span>}</td></tr>)}</tbody></table></div>}</section></section></main>;
}
