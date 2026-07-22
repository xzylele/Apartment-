type SupabaseLike = { from: (table: string) => any };
type Recipient = { id: string; line_user_id: string | null };

/** Sends an operational notification to every enabled LINE administrator and records delivery history. */
export async function notifyLineAdmin(supabase: SupabaseLike, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  const { data: connections } = await supabase.from("line_admin_connections").select("id,line_user_id").eq("enabled", true).not("line_user_id", "is", null);
  const recipients = (connections ?? []) as Recipient[];
  const results = await Promise.all(recipients.map(async (recipient) => {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ to: recipient.line_user_id, messages: [{ type: "text", text: message.slice(0, 5000) }] }) });
      return { connection_id: recipient.id, status: response.ok ? "sent" : "failed", error_message: response.ok ? null : `HTTP ${response.status}` };
    } catch (error) {
      console.error("LINE notification request failed", error);
      return { connection_id: recipient.id, status: "failed", error_message: "Network request failed" };
    }
  }));
  try {
    const successful = results.filter((result) => result.status === "sent").length;
    const title = message.split("\n").find(Boolean)?.trim() || "LINE notification";
    const { data: log } = await supabase.from("line_notification_logs").insert({ title, message, recipient_count: successful }).select("id").maybeSingle();
    if (log?.id && results.length) await supabase.from("line_notification_deliveries").insert(results.map((result) => ({ ...result, notification_log_id: log.id })));
  } catch (error) { console.error("LINE notification history failed", error); }
}

export function formatBaht(value: number) { return `\u0e3f${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }