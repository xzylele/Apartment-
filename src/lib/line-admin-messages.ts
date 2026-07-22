export const lineMenu = {
  summary: "ภาพรวม",
  income: "รายรับ",
  overdue: "บิลค้าง",
  vacant: "ห้องว่าง",
  leases: "สัญญาเช่า",
  operations: "ค่าน้ำไฟ / ซ่อม",
  choose: "เลือกหัวข้อที่ต้องการดูได้จากเมนูด้านล่าง",
  linked: "✅ เชื่อมบัญชีสำเร็จ\nเลือกข้อมูลที่ต้องการดูได้จากเมนูด้านล่าง",
  invalidLink: "⚠️ ไม่พบรหัสเชื่อมต่อ หรือรหัสหมดอายุ\nกรุณาสร้างรหัสใหม่จากหน้าตั้งค่าระบบ แล้วส่งข้อความภายใน 10 นาที",
  linkPrefix: "เชื่อม",
  menu: "เมนู",
};

const divider = "━━━━━━━━━━━━";

export const lineReport = {
  summary: (total: number, occupied: number, vacant: number, maintenance: number) => `🏢 ภาพรวมอพาร์ตเมนต์\n${divider}\n🏠 ห้องทั้งหมด: ${total} ห้อง\n👥 มีผู้เช่า: ${occupied} ห้อง\n🟢 ห้องว่าง: ${vacant} ห้อง\n🛠 อยู่ระหว่างซ่อม: ${maintenance} ห้อง\n${divider}\nข้อมูลปัจจุบันจากระบบ`,
  income: (today: string, todayCount: number, todayTotal: string, monthCount: number, monthTotal: string) => `💰 รายรับ\n${divider}\n📅 วันนี้ (${today})\n• ${todayCount} รายการ  |  ${todayTotal}\n\n📊 เดือนนี้\n• ${monthCount} รายการ  |  ${monthTotal}`,
  vacant: (lines: string[]) => lines.length ? `🟢 ห้องว่าง (${lines.length} ห้อง)\n${divider}\n${lines.join("\n")}` : `🟢 ห้องว่าง\n${divider}\nขณะนี้ไม่มีห้องว่าง`,
  leases: (lines: string[]) => lines.length ? `📄 สัญญาใกล้หมดอายุ\n${divider}\nภายใน 30 วัน\n${lines.join("\n")}` : `📄 สัญญาใกล้หมดอายุ\n${divider}\nไม่มีสัญญาที่ครบกำหนดภายใน 30 วัน`,
};