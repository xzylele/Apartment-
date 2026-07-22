import { createClient } from "@/lib/supabase/server";
import { LineAdminManagerV3 } from "./line-admin-manager-v3";

export async function LineAdminPanel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("line_admin_connections").select("id,profile_id,line_user_id,link_code,enabled,linked_at,link_code_expires_at,profiles(full_name)").order("created_at");
  const connections = (data ?? []).filter((connection: { line_user_id: string | null; link_code_expires_at: string | null }) => connection.line_user_id || !connection.link_code_expires_at || new Date(connection.link_code_expires_at) > new Date()).map((connection: { profile_id: string; link_code?: string | null }) => connection.profile_id === user.id ? connection : { ...connection, link_code: null });
  return <LineAdminManagerV3 connections={connections as never[]} currentProfileId={user.id}/>;
}
