"use client";
import { Printer } from "lucide-react";
export function PrintButton(){return <button onClick={()=>window.print()} className="print:hidden inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"><Printer size={16}/>พิมพ์ / บันทึก PDF</button>}
