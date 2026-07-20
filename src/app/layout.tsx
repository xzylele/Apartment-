import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Apartment Manager", description: "ระบบบริหารอพาร์ตเมนต์" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const role = profile?.role === "owner" || profile?.role === "staff" || profile?.role === "tenant" ? profile.role : null;
  return <html lang="th"><body><AppShell role={role}>{children}</AppShell></body></html>;
}
