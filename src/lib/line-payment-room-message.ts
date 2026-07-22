import { formatBaht } from "@/lib/line";

const paymentMethods: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  qr: "QR Code",
};

export function paymentRoomConfirmationMessage(roomNumber: string, amount: number, method: string) {
  return `✅ ยืนยันรับชำระเงิน\n━━━━━━━━━━━━\n🏠 ห้อง: ${roomNumber}\n💰 ยอดรับชำระ: ${formatBaht(amount)}\n💳 ช่องทาง: ${paymentMethods[method] ?? method}\n━━━━━━━━━━━━\nบันทึกรายการเรียบร้อยแล้ว`;
}
