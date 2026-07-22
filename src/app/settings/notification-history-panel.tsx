import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function NotificationHistoryPanel() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("line_notification_logs").select("id,title,message,recipient_count,created_at").order("created_at", { ascending: false }).limit(30);
  if (error) return <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">ประวัติแจ้งเตือนจะพร้อมใช้งานหลังรัน migration ล่าสุด</p></section>;
  return <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="flex items-center gap-2 border-b px-5 py-4"><History size={18} className="text-teal-600"/><div><h2 className="font-bold">ประวัติการแจ้งเตือน LINE</h2><p className="text-xs text-slate-500">30 รายการล่าสุด</p></div></div>{!(data ?? []).length ? <p className="p-5 text-sm text-slate-500">ยังไม่มีประวัติการแจ้งเตือน</p> : <div className="divide-y divide-slate-100">{(data ?? []).map((log) => <article key={log.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold">{log.title}</p><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">ส่งถึง {log.recipient_count} LINE</span></div><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{log.message}</p><p className="mt-3 text-xs text-slate-400">{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(log.created_at))}</p></article>)}</div>}</section>;
}
