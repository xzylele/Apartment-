"use client";
import { useTransition } from "react";
import { Ban } from "lucide-react";
import { cancelInvoice } from "./actions";
export function CancelInvoiceButton({invoiceId,invoiceNumber}:{invoiceId:string;invoiceNumber:string}){const [pending,startTransition]=useTransition();return <button disabled={pending} onClick={()=>{if(window.confirm(`ยืนยันยกเลิกใบแจ้งหนี้ ${invoiceNumber}?`))startTransition(()=>cancelInvoice(invoiceId));}} className="inline-flex items-center gap-1 text-xs text-red-700 disabled:opacity-50"><Ban size={14}/>{pending?"กำลังยกเลิก...":"ยกเลิก"}</button>}
