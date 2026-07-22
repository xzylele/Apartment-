type SupabaseLike = { from: (table: string) => any };

/** Sends an operational notification to every enabled LINE administrator. */
export async function notifyLineAdmin(supabase: SupabaseLike, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  const { data: connections } = await supabase.from("line_admin_connections").select("line_user_id").eq("enabled", true).not("line_user_id", "is", null);
  const recipients = [...new Set((connections ?? []).map((connection: { line_user_id: string | null }) => connection.line_user_id).filter((id: string | null): id is string => Boolean(id)))];
  await Promise.all(recipients.map(async (recipient) => {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ to: recipient, messages: [{ type: "text", text: message.slice(0, 5000) }] }) });
      if (!response.ok) console.error("LINE notification failed", response.status);
    } catch (error) { console.error("LINE notification request failed", error); }
  }));
}

export function formatBaht(value: number) { return `\u0e3f${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }