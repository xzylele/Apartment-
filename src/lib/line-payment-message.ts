import { formatBaht } from "@/lib/line";

const paymentMethods: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  qr: "QR Code",
};

export function paymentConfirmationMessage(invoiceNumber: string, amount: number, method: string) {
  return `✅ ยืนยันรับชำระเงิน\n━━━━━━━━━━━━\n🧾 ใบแจ้งหนี้: ${invoiceNumber}\n💰 ยอดรับชำระ: ${formatBaht(amount)}\n💳 ช่องทาง: ${paymentMethods[method] ?? method}\n━━━━━━━━━━━━\nบันทึกรายการเรียบร้อยแล้ว`;
}
