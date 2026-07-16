"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { closeLease } from "./actions";

export function CloseLeaseButton({ leaseId, roomNumber }: { leaseId: string; roomNumber: string }) {
  const [pending, startTransition] = useTransition();
  return <button disabled={pending} onClick={() => { if (window.confirm(`ยืนยันปิดสัญญาและย้ายออกจากห้อง ${roomNumber}?`)) startTransition(() => closeLease(leaseId)); }} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"><LogOut size={14}/>{pending ? "กำลังปิด..." : "ย้ายออก"}</button>;
}
