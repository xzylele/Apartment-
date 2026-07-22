import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lineMenu, lineReport } from "@/lib/line-admin-messages";
import { richMenuDetails } from "@/lib/line-rich-menu-details";

export const runtime = "nodejs";

type LineEvent = { type: string; replyToken?: string; source?: { type?: string; userId?: string }; message?: { type?: string; text?: string }; postback?: { data?: string } };
type Settings = { line_admin_user_id?: string | null; line_link_code?: string | null; line_link_code_expires_at?: string | null };

function validSignature(body: string, signature: string | null) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const received = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  return received.length === calculated.length && timingSafeEqual(received, calculated);
}

const actions = [
  [lineMenu.summary, "admin:summary"], [lineMenu.income, "admin:income"], [lineMenu.overdue, "admin:overdue"],
  [lineMenu.vacant, "admin:vacant"], [lineMenu.leases, "admin:leases"], [lineMenu.operations, "admin:operations"],
] as const;
const menuItems = actions.map(([label, data]) => ({ type: "action", action: { type: "postback", label, data, displayText: label } }));

async function reply(replyToken: string, text: string, showMenu = false) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  const message: Record<string, unknown> = { type: "text", text };
  if (showMenu) message.quickReply = { items: menuItems };
  const response = await fetch("https://api.line.me/v2/bot/message/reply", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ replyToken, messages: [message] }) });
  if (!response.ok) console.error("LINE reply failed", response.status);
}

function bangkokDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()); }
function baht(value: number) { return `\u0e3f${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`; }

async function getMenuReply(admin: ReturnType<typeof createAdminClient>, action: string) {
  if (action === "admin:summary") {
    const { data } = await admin.from("rooms").select("status").is("deleted_at", null);
    const rooms = data ?? [];
    const count = (status: string) => rooms.filter((room: { status: string }) => room.status === status).length;
    return lineReport.summary(rooms.length, count("occupied"), count("vacant"), count("maintenance"));
  }
  if (action === "admin:income") {
    const today = bangkokDate();
    const [year, month] = today.split("-").map(Number);
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`;
    const [{ data: todayData }, { data: monthData }] = await Promise.all([
      admin.from("payments").select("amount").gte("paid_at", `${today}T00:00:00+07:00`).lt("paid_at", `${today}T23:59:59.999+07:00`),
      admin.from("payments").select("amount").gte("paid_at", monthStart).lt("paid_at", monthEnd),
    ]);
    const sum = (items: Array<{ amount: number | string }> | null) => (items ?? []).reduce((total, item) => total + Number(item.amount), 0);
    return richMenuDetails.income(today, todayData?.length ?? 0, baht(sum(todayData)), monthData?.length ?? 0, baht(sum(monthData)));
  }
  if (action === "admin:overdue") {
    const today = bangkokDate();
    const { data } = await admin.from("invoices").select("invoice_number,due_date,total_amount,rooms(room_number)").in("status", ["issued", "overdue"]).lte("due_date", today).order("due_date").limit(20);
    const invoices = data ?? [];
    const total = invoices.reduce((sum: number, invoice: { total_amount: number | string }) => sum + Number(invoice.total_amount), 0);
    const lines = invoices.map((invoice: { invoice_number: string; due_date: string; total_amount: number | string; rooms?: Array<{ room_number?: string }> }) => `${invoice.rooms?.[0]?.room_number ?? "-"} | ${invoice.invoice_number} | ${invoice.due_date} | ${baht(Number(invoice.total_amount))}`);
    return richMenuDetails.overdue(lines, baht(total));
  }
  if (action === "admin:vacant") {
    const { data } = await admin.from("rooms").select("room_number,monthly_rent").eq("status", "vacant").is("deleted_at", null).order("room_number").limit(20);
    const lines = (data ?? []).map((room: { room_number: string; monthly_rent: number | string }) => `${room.room_number} - ${baht(Number(room.monthly_rent))}/month`);
    return lineReport.vacant(lines);
  }
  if (action === "admin:leases") {
    const today = bangkokDate();
    const nearEnd = new Date();
    nearEnd.setDate(nearEnd.getDate() + 30);
    const endDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(nearEnd);
    const { data } = await admin.from("leases").select("end_date,rooms(room_number)").eq("active", true).gte("end_date", today).lte("end_date", endDate).order("end_date").limit(20);
    const lines = (data ?? []).map((lease: { end_date: string; rooms?: Array<{ room_number?: string }> | null }) => `${lease.rooms?.[0]?.room_number ?? "-"}: ${lease.end_date}`);
    return lineReport.leases(lines);
  }
  if (action === "admin:operations") {
    const month = bangkokDate().slice(0, 7);
    const [{ data: utilityData }, { data: maintenanceData }] = await Promise.all([
      admin.from("utility_bills").select("utility_type,amount").eq("bill_month", `${month}-01`),
      admin.from("maintenance_requests").select("title,status,priority,rooms(room_number)").in("status", ["open", "in_progress"]).order("priority", { ascending: false }).limit(10),
    ]);
    const bills = utilityData ?? [];
    const value = (type: string) => Number(bills.find((bill: { utility_type: string }) => bill.utility_type === type)?.amount ?? 0);
    const maintenance = (maintenanceData ?? []).map((item: { title: string; status: string; rooms?: Array<{ room_number?: string }> }) => `${item.rooms?.[0]?.room_number ?? "-"} | ${item.title} | ${item.status}`);
    return richMenuDetails.operations(month, baht(value("water")), baht(value("electric")), maintenance);
  }
  return lineMenu.choose;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-line-signature"))) return new NextResponse("Invalid signature", { status: 401 });
  const payload = JSON.parse(rawBody) as { events?: LineEvent[] };
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("line_admin_user_id,line_link_code,line_link_code_expires_at").eq("id", true).maybeSingle();
  const settings = (data ?? {}) as Settings;
  for (const event of payload.events ?? []) {
    const userId = event.source?.type === "user" ? event.source.userId : null;
    const text = event.type === "message" && event.message?.type === "text" ? event.message.text?.trim() ?? "" : "";
    const expected = settings.line_link_code ? `${lineMenu.linkPrefix} ${settings.line_link_code}` : "";
    const unexpired = settings.line_link_code_expires_at && new Date(settings.line_link_code_expires_at) > new Date();
    if (userId && expected && text === expected && unexpired) {
      await admin.from("app_settings").update({ line_admin_user_id: userId, line_link_code: null, line_link_code_expires_at: null, updated_at: new Date().toISOString() }).eq("id", true);
      if (event.replyToken) await reply(event.replyToken, lineMenu.linked, true);
    } else if (userId && userId === settings.line_admin_user_id && event.type === "postback" && event.postback?.data?.startsWith("admin:")) {
      if (event.replyToken) await reply(event.replyToken, await getMenuReply(admin, event.postback.data), true);
    } else if (userId && userId === settings.line_admin_user_id && [lineMenu.menu, "menu"].includes(text.toLowerCase())) {
      if (event.replyToken) await reply(event.replyToken, lineMenu.choose, true);
    } else if (event.replyToken && text.startsWith(lineMenu.linkPrefix)) {
      await reply(event.replyToken, lineMenu.invalidLink);
    }
  }
  return NextResponse.json({ ok: true });
}