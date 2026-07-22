import { paymentReceivedMessage } from "@/lib/line-notification-messages";

export function paymentRoomConfirmationMessage(roomNumber: string, amount: number, method: string) {
  return paymentReceivedMessage(roomNumber, amount, method);
}