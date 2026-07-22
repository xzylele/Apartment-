import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
function validSignature(body: string, signature: string | null) { const secret = process.env.LINE_CHANNEL_SECRET; if (!secret || !signature) return false; const expected = createHmac("sha256", secret).update(body).digest("base64"); const received = Buffer.from(signature); const calculated = Buffer.from(expected); return received.length === calculated.length && timingSafeEqual(received, calculated); }
async function reply(replyToken: string, text: string) { const token = process.env.LINE_CHANNEL_ACCESS_TOKEN; if (!token) return; await fetch("https://api.line.me/v2/bot/message/reply", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }) }); }

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-line-signature"))) return new NextResponse("Invalid signature", { status: 401 });
  const payload = JSON.parse(rawBody) as { events?: Array<any> };
  const admin = createAdminClient();
  const { data: settings } = await admin.from("app_settings").select("line_link_code,line_link_code_expires_at").eq("id", true).maybeSingle();
  for (const event of payload.events ?? []) {
    const text = event.type === "message" && event.message?.type === "text" ? event.message.text.trim() : "";
    const userId = event.source?.type === "user" ? event.source.userId : null;
    const expected = settings?.line_link_code ? `เชื่อม ${settings.line_link_code}` : "";
    const unexpired = settings?.line_link_code_expires_at && new Date(settings.line_link_code_expires_at) > new Date();
    if (userId && expected && text === expected && unexpired) {
      await admin.from("app_settings").update({ line_admin_user_id: userId, line_link_code: null, line_link_code_expires_at: null, updated_at: new Date().toISOString() }).eq("id", true);
      if (event.replyToken) await reply(event.replyToken, "เชื่อมบัญชีสำเร็จ คุณจะได้รับการแจ้งเตือนจากระบบอพาร์ตเมนต์");
    } else if (event.replyToken && text.startsWith("เชื่อม")) {
      await reply(event.replyToken, "ไม่พบรหัสเชื่อมที่ใช้งานได้ กรุณาสร้างรหัสใหม่จากหน้าตั้งค่าระบบ แล้วส่งข้อความตามรหัสภายใน 10 นาที");
    }
  }
  return NextResponse.json({ ok: true });
}
