import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const menuItems = [
  { type: "action", action: { type: "postback", label: "ภาพรวม", data: "admin:summary", displayText: "ดูภาพรวม" } },
  { type: "action", action: { type: "postback", label: "รายรับวันนี้", data: "admin:income", displayText: "ดูรายรับวันนี้" } },
  { type: "action", action: { type: "postback", label: "ค่าน้ำค่าไฟ", data: "admin:utilities", displayText: "ดูค่าน้ำค่าไฟ" } },
  { type: "action", action: { type: "postback", label: "ห้องว่าง", data: "admin:vacant", displayText: "ดูห้องว่าง" } },
];

async function reply(replyToken: string, text: string, showMenu = false) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  const message: Record<string, unknown> = { type: "text", text };
  if (showMenu) message.quickReply = { items: menuItems };
  const response = await fetch("https://api.line.me/v2/bot/message/reply", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ replyToken, messages: [message] }) });
  if (!response.ok) console.error("LINE reply failed", response.status);
}

function bangkokDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()); }
function baht(value: number) { return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`; }

async function getMenuReply(admin: ReturnType<typeof createAdminClient>, action: string) {
  if (action === "admin:summary") {
    const { data: roomData } = await admin.from("rooms").select("status").is("deleted_at", null);
    const rooms = roomData ?? [];
    const count = (status: string) => rooms.filter((room: { status: string }) => room.status === status).length;
    return `ภาพรวมอพาร์ตเมนต์\nห้องทั้งหมด ${rooms.length} ห้อง\nผู้เช่าอยู่ ${count("occupied")} ห้อง\nห้องว่าง ${count("vacant")} ห้อง\nอยู่ระหว่างซ่อม ${count("maintenance")} ห้อง`;
  }
  if (action === "admin:income") {
    const today = bangkokDate();
    const { data: paymentData } = await admin.from("payments").select("amount").gte("paid_at", `${today}T00:00:00+07:00`).lt("paid_at", `${today}T23:59:59.999+07:00`);
    const payments = paymentData ?? [];
    const total = payments.reduce((sum: number, payment: { amount: number | string }) => sum + Number(payment.amount), 0);
    return `รายรับวันนี้ (${today})\nรับชำระ ${payments.length} รายการ\nรวม ${baht(total)}`;
  }
  if (action === "admin:utilities") {
    const month = bangkokDate().slice(0, 7);
    const { data: billData } = await admin.from("utility_bills").select("utility_type,amount,due_date,paid_date").eq("bill_month", `${month}-01`);
    const bills = billData ?? [];
    const water = bills.find((bill: { utility_type: string }) => bill.utility_type === "water");
    const electric = bills.find((bill: { utility_type: string }) => bill.utility_type === "electric");
    if (!water && !electric) return `ค่าน้ำค่าไฟ ${month}\nยังไม่มีข้อมูลในเดือนนี้`;
    const billLine = (label: string, bill?: { amount: number | string; due_date?: string | null; paid_date?: string | null }) => bill ? `${label} ${baht(Number(bill.amount))}${bill.paid_date ? " (ชำระแล้ว)" : bill.due_date ? ` (ครบกำหนด ${bill.due_date})` : ""}` : `${label} —`;
    return `ค่าน้ำค่าไฟ ${month}\n${billLine("ค่าน้ำ", water)}\n${billLine("ค่าไฟ", electric)}`;
  }
  if (action === "admin:vacant") {
    const { data: roomData } = await admin.from("rooms").select("room_number,monthly_rent").eq("status", "vacant").is("deleted_at", null).order("room_number").limit(20);
    const rooms = roomData ?? [];
    if (!rooms.length) return "ห้องว่าง\nขณะนี้ไม่มีห้องว่าง";
    const lines = rooms.map((room: { room_number: string; monthly_rent: number | string }) => `ห้อง ${room.room_number} — ${baht(Number(room.monthly_rent))}/เดือน`);
    return `ห้องว่าง (${rooms.length} ห้อง)\n${lines.join("\n")}`;
  }
  return "เลือกเมนูที่ต้องการได้เลย";
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
    const expected = settings.line_link_code ? `เชื่อม ${settings.line_link_code}` : "";
    const unexpired = settings.line_link_code_expires_at && new Date(settings.line_link_code_expires_at) > new Date();
    if (userId && expected && text === expected && unexpired) {
      await admin.from("app_settings").update({ line_admin_user_id: userId, line_link_code: null, line_link_code_expires_at: null, updated_at: new Date().toISOString() }).eq("id", true);
      if (event.replyToken) await reply(event.replyToken, "เชื่อมบัญชีสำเร็จ เลือกข้อมูลที่ต้องการดูได้เลย", true);
    } else if (userId && userId === settings.line_admin_user_id && event.type === "postback" && event.postback?.data?.startsWith("admin:")) {
      if (event.replyToken) await reply(event.replyToken, await getMenuReply(admin, event.postback.data), true);
    } else if (userId && userId === settings.line_admin_user_id && ["เมนู", "menu"].includes(text.toLowerCase())) {
      if (event.replyToken) await reply(event.replyToken, "เลือกข้อมูลที่ต้องการดูได้เลย", true);
    } else if (event.replyToken && text.startsWith("เชื่อม")) {
      await reply(event.replyToken, "ไม่พบรหัสเชื่อมที่ใช้งานได้ กรุณาสร้างรหัสใหม่จากหน้าตั้งค่าระบบ แล้วส่งข้อความตามรหัสภายใน 10 นาที");
    }
  }
  return NextResponse.json({ ok: true });
}