export const richMenuDetails = {
  income: (today: string, todayCount: number, todayTotal: string, monthCount: number, monthTotal: string, latest?: string) => `รายรับ\nวันนี้ ${today}: ${todayCount} รายการ รวม ${todayTotal}\nเดือนนี้: ${monthCount} รายการ รวม ${monthTotal}${latest ? `\nล่าสุด: ${latest}` : ""}`,
  overdue: (lines: string[], total: string) => lines.length ? `บิลค้างชำระ (${lines.length} รายการ)\n${lines.join("\n")}\nรวม ${total}` : "บิลค้างชำระ\nไม่มีรายการค้างชำระ",
  operations: (month: string, water: string, electric: string, maintenance: string[]) => `ค่าน้ำค่าไฟ ${month}\nค่าน้ำ ${water}\nค่าไฟ ${electric}\n\nงานซ่อมที่ยังไม่เสร็จ${maintenance.length ? `\n${maintenance.join("\n")}` : "\nไม่มีงานค้าง"}`,
};
