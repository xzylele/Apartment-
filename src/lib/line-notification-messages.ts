import { formatBaht } from "@/lib/line";

const divider = "━━━━━━━━━━━━";

function thaiMonth(month: string) {
  const date = new Date(`${month}-01T00:00:00+07:00`);
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(date);
}

export function paymentReceivedMessage(roomNumber: string, amount: number, method: string) {
  const methods: Record<string, string> = { cash: "เงินสด", transfer: "โอนเงิน", qr: "QR Code" };
  return `✅ รับชำระเรียบร้อย\n${divider}\n🏠 ห้อง: ${roomNumber}\n💰 ยอดรับชำระ: ${formatBaht(amount)}\n💳 ช่องทาง: ${methods[method] ?? method}\n${divider}\nบันทึกรายการเข้าระบบแล้ว`;
}

export function utilitySavedMessage(month: string, water: number, electric: number) {
  return `💧⚡ บันทึกค่าน้ำและค่าไฟ\n${divider}\n🗓 รอบบิล: ${thaiMonth(month)}\n💧 ค่าน้ำ: ${formatBaht(water)}\n⚡ ค่าไฟ: ${formatBaht(electric)}\n💰 รวม: ${formatBaht(water + electric)}\n${divider}\nอัปเดตข้อมูลเรียบร้อยแล้ว`;
}

export function leaseCreatedMessage(roomNumber: string, tenantName: string, rent: number, startDate: string, endDate: string) {
  return `📄 สร้างสัญญาเช่าใหม่\n${divider}\n🏠 ห้อง: ${roomNumber}\n👤 ผู้เช่า: ${tenantName}\n💰 ค่าเช่า: ${formatBaht(rent)} / เดือน\n🗓 ระยะสัญญา: ${startDate} – ${endDate}\n${divider}\nห้องถูกปรับเป็นสถานะมีผู้เช่าแล้ว`;
}

export function roomVacantMessage(roomNumber: string, reason: "close" | "moveOut") {
  const detail = reason === "moveOut" ? "ผู้เช่าย้ายออกแล้ว" : "ปิดสัญญาเช่าแล้ว";
  return `🏠 ห้องว่าง\n${divider}\n🏠 ห้อง: ${roomNumber}\n📌 สถานะ: ${detail}\n${divider}\nโปรดตรวจสอบห้องและเตรียมเปิดเช่า`;
}