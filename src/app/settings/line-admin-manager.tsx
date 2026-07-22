"use client";

import { useActionState, useTransition } from "react";
import { Bell, Link2, Power, Unlink } from "lucide-react";
import { createMyLineLinkCode, disconnectMyLine, setMyLineEnabled, type LineAdminActionState } from "./line-admin-actions";

type Connection = { profile_id: string; line_user_id: string | null; enabled: boolean; linked_at: string | null; profiles: { full_name: string } | null };

export function LineAdminManager({ connections, currentProfileId }: { connections: Connection[]; currentProfileId: string }) {
  const [state, createCode, pending] = useActionState<LineAdminActionState, FormData>(createMyLineLinkCode, {});
  const [switching, startTransition] = useTransition();
  const mine = connections.find((connection) => connection.profile_id === currentProfileId);
  const isLinked = Boolean(mine?.line_user_id);
  const toggle = () => startTransition(() => { void setMyLineEnabled(!(mine?.enabled ?? false)); });
  const disconnect = () => { if (window.confirm("ยืนยันยกเลิกการเชื่อมต่อ LINE ของคุณ?")) startTransition(() => { void disconnectMyLine(); }); };
  return <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-bold"><Bell size={18} className="text-teal-600"/>ผู้ดูแล LINE</h2><p className="mt-1 text-sm text-slate-500">ผู้ดูแลที่เปิดใช้งานจะได้รับแจ้งเตือนทุกประเภท</p></div><form action={createCode}><button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-teal-400"><Link2 size={16}/>{pending ? "กำลังสร้าง..." : "เชื่อม LINE ของฉัน"}</button></form></div>{state.code && <div className="mt-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-950"><p>ส่งข้อความนี้ในแชต OA ภายใน 10 นาที:</p><code className="mt-2 inline-block rounded bg-white px-3 py-2 font-semibold">เชื่อม {state.code}</code></div>}{state.error && <p className="mt-3 text-sm text-rose-700">{state.error}</p>}<div className="mt-5 space-y-3">{connections.map((connection) => { const own = connection.profile_id === currentProfileId; return <div key={connection.profile_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="font-semibold">{connection.profiles?.full_name ?? "ผู้ดูแล"}{own && <span className="ml-2 text-xs font-normal text-slate-500">(คุณ)</span>}</p><p className="mt-1 text-sm text-slate-500">{connection.line_user_id ? connection.enabled ? "เชื่อมแล้ว · รับการแจ้งเตือน" : "เชื่อมแล้ว · ปิดการแจ้งเตือน" : "ยังไม่เชื่อม LINE"}</p></div>{own && isLinked && <div className="flex items-center gap-2"><button disabled={switching} onClick={toggle} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${mine?.enabled ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600"}`}><Power size={14}/>{mine?.enabled ? "เปิดอยู่" : "ปิดอยู่"}</button><button disabled={switching} onClick={disconnect} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><Unlink size={14}/>ยกเลิก</button></div>}</div>; })}{!connections.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มีผู้ดูแลเชื่อม LINE</p>}</div></section>;
}
