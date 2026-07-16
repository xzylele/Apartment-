import { Building2, ChevronLeft, CircleDollarSign, DoorOpen, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomForm } from "./room-form";
import { RoomDirectory, type RoomDirectoryItem } from "./room-directory";

export default async function RoomsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data, error }, { data: settings }, { data: activeLeases }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("rooms").select("id,room_number,floor,room_type,size_sqm,monthly_rent,deposit,water_rate,electric_rate,status").is("deleted_at", null).order("room_number"),
    supabase.from("app_settings").select("default_water_rate,default_electric_rate,default_room_floor,default_room_type").eq("id", true).maybeSingle(),
    supabase.from("leases").select("room_id,profiles!leases_tenant_id_fkey(full_name)").eq("active", true),
  ]);
  if (!profile || !["owner", "staff"].includes(profile.role)) redirect("/dashboard");
  const tenantByRoom = new Map((activeLeases ?? []).map((lease: any) => [lease.room_id, Array.isArray(lease.profiles) ? lease.profiles[0]?.full_name ?? null : lease.profiles?.full_name ?? null]));
  const rooms = (data ?? []).map((room: any) => ({ ...room, tenant_name: tenantByRoom.get(room.id) ?? null })) as RoomDirectoryItem[];
  const occupied = rooms.filter((room) => room.status === "occupied").length;
  const vacant = rooms.filter((room) => room.status === "vacant").length;
  const maintenance = rooms.filter((room) => room.status === "maintenance").length;

  return <main className="min-h-screen"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={20}/></Link><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white"><Building2 size={20}/></span><div><h1 className="font-bold">ห้องพัก</h1><p className="text-xs text-slate-500">ดูสถานะ ผู้เช่า และจัดการข้อมูลห้องทั้งหมด</p></div></div></header><section className="mx-auto max-w-7xl px-5 py-8"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl bg-white p-5"><DoorOpen className="text-slate-600" size={21}/><p className="mt-3 text-sm text-slate-500">ห้องทั้งหมด</p><p className="mt-1 text-2xl font-bold">{rooms.length}</p></article><article className="rounded-2xl border-blue-100 bg-blue-50/60 p-5"><Building2 className="text-blue-600" size={21}/><p className="mt-3 text-sm text-blue-700">มีผู้เช่า</p><p className="mt-1 text-2xl font-bold text-blue-900">{occupied}</p><p className="mt-1 text-xs text-blue-700">{rooms.length ? Math.round(occupied / rooms.length * 100) : 0}% ของห้องทั้งหมด</p></article><article className="rounded-2xl border-teal-100 bg-teal-50/60 p-5"><CircleDollarSign className="text-teal-600" size={21}/><p className="mt-3 text-sm text-teal-700">ห้องว่าง</p><p className="mt-1 text-2xl font-bold text-teal-900">{vacant}</p><p className="mt-1 text-xs text-teal-700">พร้อมทำสัญญาเช่า</p></article><article className="rounded-2xl border-amber-100 bg-amber-50/60 p-5"><Wrench className="text-amber-600" size={21}/><p className="mt-3 text-sm text-amber-700">ซ่อมบำรุง</p><p className="mt-1 text-2xl font-bold text-amber-900">{maintenance}</p><p className="mt-1 text-xs text-amber-700">ห้องที่ยังไม่พร้อมใช้งาน</p></article></div><div className="mt-6"><RoomForm canManage waterRate={Number(settings?.default_water_rate ?? 0)} electricRate={Number(settings?.default_electric_rate ?? 0)} defaultFloor={Number(settings?.default_room_floor ?? 1)} defaultRoomType={settings?.default_room_type === "ห้องแอร์" ? "ห้องแอร์" : "ห้องพัดลม"}/></div>{error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">ไม่สามารถโหลดข้อมูลห้องพักได้ กรุณาลองใหม่อีกครั้ง</div> : <RoomDirectory rooms={rooms} canArchive={profile.role === "owner"}/>}</section></main>;
}