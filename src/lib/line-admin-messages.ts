export const lineMenu = {
  summary: "ภาพรวม",
  income: "รายรับ",
  overdue: "บิลค้าง",
  vacant: "ห้องว่าง",
  leases: "สัญญาเช่า",
  operations: "ค่าน้ำไฟ / ซ่อม",
  choose: "เลือกข้อมูลที่ต้องการดูได้เลย",
  linked: "เชื่อมบัญชีสำเร็จ เลือกข้อมูลที่ต้องการดูได้เลย",
  invalidLink: "ไม่พบรหัสเชื่อมที่ใช้งานได้ กรุณาสร้างรหัสใหม่จากหน้าตั้งค่าระบบ แล้วส่งข้อความตามรหัสภายใน 10 นาที",
  linkPrefix: "เชื่อม",
  menu: "เมนู",
};

export const lineReport = {
  summary: (total: number, occupied: number, vacant: number, maintenance: number) => `ภาพรวมอพาร์ตเมนต์\nห้องทั้งหมด ${total} ห้อง\nผู้เช่าอยู่ ${occupied} ห้อง\nห้องว่าง ${vacant} ห้อง\nอยู่ระหว่างซ่อม ${maintenance} ห้อง`,
  income: (today: string, todayCount: number, todayTotal: string, monthCount: number, monthTotal: string) => `รายรับ\nวันนี้ ${today}: ${todayCount} รายการ รวม ${todayTotal}\nเดือนนี้: ${monthCount} รายการ รวม ${monthTotal}`,
  overdue: (count: number, total: string) => count ? `บิลค้างชำระ\n${count} รายการ รวม ${total}` : "บิลค้างชำระ\nไม่มีรายการค้างชำระ",
  vacant: (lines: string[]) => lines.length ? `ห้องว่าง (${lines.length} ห้อง)\n${lines.join("\n")}` : "ห้องว่าง\nขณะนี้ไม่มีห้องว่าง",
  leases: (lines: string[]) => lines.length ? `สัญญาใกล้หมด (30 วัน)\n${lines.join("\n")}` : "สัญญาใกล้หมด\nไม่มีสัญญาที่ครบกำหนดภายใน 30 วัน",
  operations: (month: string, water: string, electric: string, maintenanceCount: number) => `ค่าน้ำค่าไฟ ${month}\nค่าน้ำ ${water}\nค่าไฟ ${electric}\nงานซ่อมที่ยังไม่เสร็จ ${maintenanceCount} งาน`,
};
