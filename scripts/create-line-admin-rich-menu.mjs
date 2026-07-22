import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const env = Object.fromEntries(fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const token = env.LINE_CHANNEL_ACCESS_TOKEN;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!token || !supabaseUrl || !serviceKey) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN or Supabase settings in .env.local");

const auth = { Authorization: `Bearer ${token}` };
const settingsResponse = await fetch(`${supabaseUrl}/rest/v1/app_settings?id=eq.true&select=line_admin_user_id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
const [settings] = await settingsResponse.json();
if (!settings?.line_admin_user_id) throw new Error("Link the administrator's LINE account before creating a rich menu.");

const richMenu = { size: { width: 2500, height: 1686 }, selected: true, name: "Apartment administrator menu", chatBarText: "เมนูอพาร์ตเมนต์", areas: [
  { bounds: { x: 0, y: 120, width: 833, height: 783 }, action: { type: "postback", data: "admin:summary", displayText: "ดูภาพรวม" } },
  { bounds: { x: 833, y: 120, width: 834, height: 783 }, action: { type: "postback", data: "admin:income", displayText: "ดูรายรับ" } },
  { bounds: { x: 1667, y: 120, width: 833, height: 783 }, action: { type: "postback", data: "admin:overdue", displayText: "ดูบิลค้าง" } },
  { bounds: { x: 0, y: 903, width: 833, height: 783 }, action: { type: "postback", data: "admin:vacant", displayText: "ดูห้องว่าง" } },
  { bounds: { x: 833, y: 903, width: 834, height: 783 }, action: { type: "postback", data: "admin:leases", displayText: "ดูสัญญาเช่า" } },
  { bounds: { x: 1667, y: 903, width: 833, height: 783 }, action: { type: "postback", data: "admin:operations", displayText: "ดูค่าน้ำไฟและงานซ่อม" } },
] };
const createResponse = await fetch("https://api.line.me/v2/bot/richmenu", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(richMenu) });
if (!createResponse.ok) throw new Error(`Create rich menu failed: ${await createResponse.text()}`);
const { richMenuId } = await createResponse.json();
const image = fs.readFileSync(path.join(root, "public", "line-admin-rich-menu.png"));
const uploadResponse = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, { method: "POST", headers: { ...auth, "Content-Type": "image/png" }, body: image });
if (!uploadResponse.ok) throw new Error(`Upload rich menu image failed: ${await uploadResponse.text()}`);
const linkResponse = await fetch(`https://api.line.me/v2/bot/user/${settings.line_admin_user_id}/richmenu/${richMenuId}`, { method: "POST", headers: auth });
if (!linkResponse.ok) throw new Error(`Link rich menu failed: ${await linkResponse.text()}`);
console.log(`Rich menu linked to the administrator: ${richMenuId}`);
