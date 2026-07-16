import { Download } from "lucide-react";

export function ExportLinks() {
  return <div className="flex flex-wrap gap-2"><a href="/api/export/invoices" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"><Download size={15}/>บิล CSV</a><a href="/api/export/payments" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"><Download size={15}/>ชำระเงิน CSV</a><a href="/api/export/expenses" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"><Download size={15}/>รายจ่าย CSV</a></div>;
}
