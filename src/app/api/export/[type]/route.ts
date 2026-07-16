import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [Object.keys(rows[0]).map(escape).join(","), ...rows.map((row) => Object.values(row).map(escape).join(","))].join("\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let rows: Record<string, unknown>[] = [];
  if (type === "invoices") { const { data = [] } = await supabase.from("invoices").select("invoice_number,billing_month,due_date,total_amount,status,rooms(room_number)").order("billing_month", { ascending: false }); rows = (data ?? []).map((item: any) => ({ invoice_number: item.invoice_number, room_number: item.rooms?.room_number, billing_month: item.billing_month, due_date: item.due_date, total_amount: item.total_amount, status: item.status })); }
  else if (type === "payments") { const { data = [] } = await supabase.from("payments").select("paid_at,amount,method,reference,invoices(invoice_number,rooms(room_number))").order("paid_at", { ascending: false }); rows = (data ?? []).map((item: any) => ({ paid_at: item.paid_at, invoice_number: item.invoices?.invoice_number, room_number: item.invoices?.rooms?.room_number, amount: item.amount, method: item.method, reference: item.reference })); }
  else if (type === "expenses") { const { data = [] } = await supabase.from("expenses").select("expense_date,category,description,amount").order("expense_date", { ascending: false }); rows = data ?? []; }
  else return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  return new NextResponse(`\uFEFF${csv(rows)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
