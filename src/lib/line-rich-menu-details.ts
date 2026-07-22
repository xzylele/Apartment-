const divider = "━━━━━━━━━━━━";

export const richMenuDetails = {
  income: (today: string, todayCount: number, todayTotal: string, monthCount: number, monthTotal: string) => `💰 รายรับ\n${divider}\n📅 วันนี้ (${today})\n• รับชำระ ${todayCount} รายการ\n• รวม ${todayTotal}\n\n📊 เดือนนี้\n• รับชำระ ${monthCount} รายการ\n• รวม ${monthTotal}`,
  overdue: (lines: string[], total: string) => lines.length ? `⚠️ บิลค้างชำระ (${lines.length} รายการ)\n${divider}\n${lines.join("\n")}\n${divider}\n💰 ยอดค้างรวม: ${total}` : `✅ บิลค้างชำระ\n${divider}\nไม่มีรายการค้างชำระ`,
  operations: (month: string, water: string, electric: string, maintenance: string[]) => `💧⚡ ค่าน้ำไฟ / งานซ่อม\n${divider}\n🗓 รอบบิล: ${month}\n💧 ค่าน้ำ: ${water}\n⚡ ค่าไฟ: ${electric}\n\n🛠 งานซ่อมที่รอดำเนินการ\n${maintenance.length ? maintenance.join("\n") : "✅ ไม่มีงานค้าง"}`,
};