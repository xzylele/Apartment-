import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const values = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

const env = loadEnv(".env.local");
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase environment variables are missing");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: settings } = await supabase.from("app_settings").select("default_water_rate,default_electric_rate").eq("id", true).maybeSingle();
const waterRate = Number(settings?.default_water_rate ?? 18);
const electricRate = Number(settings?.default_electric_rate ?? 8);
const rooms = [];
for (let floor = 1; floor <= 4; floor += 1) {
  for (let index = 1; index <= 10; index += 1) {
    const ordinal = (floor - 1) * 10 + index;
    const roomType = ordinal <= 25 ? "ห้องพัดลม" : "ห้องแอร์";
    const monthlyRent = roomType === "ห้องพัดลม" ? 3500 + (floor - 1) * 100 : 5000 + (floor - 1) * 100;
    rooms.push({ room_number: `${floor}${String(index).padStart(2, "0")}`, floor, room_type: roomType, size_sqm: roomType === "ห้องพัดลม" ? 24 : 28, monthly_rent: monthlyRent, deposit: monthlyRent, water_rate: waterRate, electric_rate: electricRate, status: "vacant" });
  }
}
const { error: roomError } = await supabase.from("rooms").upsert(rooms, { onConflict: "room_number", ignoreDuplicates: true });
if (roomError) throw new Error(`Cannot seed rooms: ${roomError.message}`);
const fanNumbers = rooms.filter((room) => room.room_type === "ห้องพัดลม").map((room) => room.room_number);
const airNumbers = rooms.filter((room) => room.room_type === "ห้องแอร์").map((room) => room.room_number);
const [{ error: fanTypeError }, { error: airTypeError }] = await Promise.all([
  supabase.from("rooms").update({ room_type: "ห้องพัดลม" }).in("room_number", fanNumbers),
  supabase.from("rooms").update({ room_type: "ห้องแอร์" }).in("room_number", airNumbers),
]);
if (fanTypeError || airTypeError) throw new Error(fanTypeError?.message || airTypeError?.message);

const tenantNames = ["กิตติพงษ์ ใจดี", "สุภาวดี มีสุข", "ณัฐวุฒิ แสงทอง", "พิมพ์ชนก รักษ์ดี", "ธนภัทร วัฒนะ", "ศิริพร บุญช่วย", "ปกรณ์ นิ่มนวล", "ชลธิชา พรหมมา", "วรเมธ สุขใจ", "อรทัย คำดี"];
const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw new Error(`Cannot list users: ${listError.message}`);
let createdTenants = 0;
for (let index = 0; index < tenantNames.length; index += 1) {
  const number = String(index + 1).padStart(2, "0");
  const email = `tenant${number}.mock@example.com`;
  let authUser = userList.users.find((user) => user.email?.toLowerCase() === email);
  if (!authUser) {
    const password = `Mock!${randomBytes(18).toString("base64url")}9a`;
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: tenantNames[index], mock_data: true } });
    if (error) throw new Error(`Cannot create ${email}: ${error.message}`);
    authUser = data.user;
    createdTenants += 1;
  }
  const { error: profileError } = await supabase.from("profiles").upsert({ id: authUser.id, full_name: tenantNames[index], phone: `081-555-${String(1000 + index)}`, role: "tenant" }, { onConflict: "id" });
  if (profileError) throw new Error(`Cannot create tenant profile ${email}: ${profileError.message}`);
}

const [{ data: finalRooms, error: finalRoomError }, { data: finalTenants, error: finalTenantError }] = await Promise.all([
  supabase.from("rooms").select("room_number,room_type").in("room_number", rooms.map((room) => room.room_number)).is("deleted_at", null),
  supabase.from("profiles").select("id,full_name,role").eq("role", "tenant"),
]);
if (finalRoomError || finalTenantError) throw new Error(finalRoomError?.message || finalTenantError?.message);
const fanRooms = finalRooms.filter((room) => room.room_type === "ห้องพัดลม").length;
const airRooms = finalRooms.filter((room) => room.room_type === "ห้องแอร์").length;
console.log(JSON.stringify({ targetRooms: finalRooms.length, fanRooms, airRooms, tenantProfiles: finalTenants.length, tenantsCreatedNow: createdTenants }, null, 2));