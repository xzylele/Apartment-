type SupabaseLike = { from: (table: string) => any };

/** Sends an operational notification only when LINE has been configured and linked. */
export async function notifyLineAdmin(supabase: SupabaseLike, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  const { data: settings } = await supabase.from("app_settings").select("line_admin_user_id").eq("id", true).maybeSingle();
  if (!settings?.line_admin_user_id) return;
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ to: settings.line_admin_user_id, messages: [{ type: "text", text: message.slice(0, 5000) }] }) });
    if (!response.ok) console.error("LINE notification failed", response.status);
  } catch (error) { console.error("LINE notification request failed", error); }
}

export function formatBaht(value: number) { return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
