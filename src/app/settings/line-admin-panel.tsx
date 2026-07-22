import { createClient } from "@/lib/supabase/server";
import { LineAdminManagerV2 } from "./line-admin-manager-v2";

export async function LineAdminPanel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("line_admin_connections").select("id,profile_id,line_user_id,enabled,linked_at,profiles(full_name)").order("created_at");
  return <LineAdminManagerV2 connections={(data ?? []) as never[]} currentProfileId={user.id}/>;
}
