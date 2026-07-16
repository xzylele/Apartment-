"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, FilePlus2, UserRoundCheck } from "lucide-react";
import { createLease, type LeaseFormState } from "./actions";

type Room = { id: string; room_number: string; monthly_rent: number; deposit: number };
type Tenant = { id: string; full_name: string; activeLease: { roomNumber: string; endDate: string } | null };
const initialState: LeaseFormState = {};
const field = "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

function endFromDuration(start: string, amount: number, unit: "month" | "year") {
  if (!start || !Number.isFinite(amount) || amount < 1) return "";
  const [year, month, day] = start.split("-").map(Number);
  const monthsToAdd = unit === "year" ? amount * 12 : amount;
  const targetMonthIndex = month - 1 + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function LeaseForm({ rooms, tenants }: { rooms: Room[]; tenants: Tenant[] }) {
  const [state, action, pending] = useActionState(createLease, initialState);
  const availableTenants = useMemo(() => tenants.filter((tenant) => !tenant.activeLease), [tenants]);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [tenantId, setTenantId] = useState(availableTenants[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today());
  const [duration, setDuration] = useState(12);
  const [unit, setUnit] = useState<"month" | "year">("month");
  const selectedRoom = rooms.find((room) => room.id === roomId);
  const selectedTenant = tenants.find((tenant) => tenant.id === tenantId);
  const endDate = endFromDuration(startDate, duration, unit);
  useEffect(() => { if (!availableTenants.some((tenant) => tenant.id === tenantId)) setTenantId(availableTenants[0]?.id ?? ""); }, [availableTenants, tenantId]);

  if (!rooms.length || !tenants.length) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">ต้องมีทั้งห้องว่างและบัญชีผู้เช่าก่อน จึงจะสร้างสัญญาเช่าได้</div>;

  return <details className="rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700"><FilePlus2 size={18}/></span><span>สร้างสัญญาเช่าใหม่<small className="mt-0.5 block font-normal text-slate-500">กำหนดระยะสัญญาเป็นเดือนหรือปีได้ทันที</small></span></summary><div className="border-t border-slate-100 p-5">{!availableTenants.length ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={17}/>ผู้เช่าทั้งหมดมีสัญญาที่ใช้งานอยู่</div><p className="mt-1">ต้องย้ายออกหรือปิดสัญญาเดิมก่อนจึงจะทำสัญญาใหม่ได้</p></div> : <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-medium">ห้องพัก<select name="roomId" required value={roomId} onChange={(event) => setRoomId(event.target.value)} className={field}>{rooms.map((room) => <option key={room.id} value={room.id}>ห้อง {room.room_number} · ฿{Number(room.monthly_rent).toLocaleString("th-TH")}</option>)}</select></label><label className="text-sm font-medium">ผู้เช่า<select name="tenantId" required value={tenantId} onChange={(event) => setTenantId(event.target.value)} className={`${field} ${selectedTenant?.activeLease ? "border-rose-400 bg-rose-50 text-rose-700" : ""}`}>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id} disabled={Boolean(tenant.activeLease)} className={tenant.activeLease ? "text-rose-600" : ""}>{tenant.activeLease ? `${tenant.full_name} — มีสัญญาอยู่แล้ว (ห้อง ${tenant.activeLease.roomNumber})` : tenant.full_name}</option>)}</select>{selectedTenant?.activeLease ? <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700"><AlertCircle size={13}/>มีสัญญาห้อง {selectedTenant.activeLease.roomNumber} ถึง {selectedTenant.activeLease.endDate}</span> : <span className="mt-1.5 flex items-center gap-1 text-xs text-teal-700"><UserRoundCheck size={13}/>ผู้เช่ารายนี้พร้อมทำสัญญา</span>}</label><label className="text-sm font-medium">ค่าเช่าต่อเดือน<input name="rentAmount" type="number" min="0" required key={`rent-${roomId}`} defaultValue={selectedRoom?.monthly_rent ?? 0} className={field}/></label><label className="text-sm font-medium">วันเริ่มสัญญา<input name="startDate" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className={field}/></label><label className="text-sm font-medium">ระยะสัญญา<div className="mt-1.5 flex gap-2"><input type="number" min="1" max="120" value={duration} onChange={(event) => setDuration(Math.max(1, Number(event.target.value) || 1))} className="w-24 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/><select value={unit} onChange={(event) => setUnit(event.target.value as "month" | "year")} className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="month">เดือน</option><option value="year">ปี</option></select></div></label><label className="text-sm font-medium">วันสิ้นสุดสัญญา<input name="endDate" type="date" required value={endDate} readOnly className={`${field} bg-slate-50 font-medium text-teal-800`}/><span className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"><CalendarDays size={13}/>คำนวณจากวันเริ่มและระยะสัญญา</span></label><label className="text-sm font-medium">เงินประกัน<input name="depositAmount" type="number" min="0" key={`deposit-${roomId}`} defaultValue={selectedRoom?.deposit ?? 0} className={field}/></label><p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3">วันสิ้นสุดนับเป็นวันสุดท้ายของสัญญา เช่น เริ่ม 1 ม.ค. ระยะ 1 ปี จะสิ้นสุด 31 ธ.ค.</p><div className="sm:col-span-2 lg:col-span-3">{state.error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>}{state.success && <p className="mb-3 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700">{state.success}</p>}<button disabled={pending || !tenantId || Boolean(selectedTenant?.activeLease)} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-teal-400">{pending ? "กำลังบันทึก..." : "บันทึกสัญญา"}</button></div></form>}</div></details>;
}