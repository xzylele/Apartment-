"use client";

import { useEffect, useState } from "react";

function remaining(expiresAt: string) {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

export function LineLinkCountdown({ code, expiresAt }: { code: string | null; expiresAt: string | null }) {
  const [milliseconds, setMilliseconds] = useState(expiresAt ? remaining(expiresAt) : 0);
  useEffect(() => { if (!expiresAt) return; const timer = window.setInterval(() => setMilliseconds(remaining(expiresAt)), 1_000); return () => window.clearInterval(timer); }, [expiresAt]);
  if (!code || !expiresAt || milliseconds <= 0) return <span>รหัสเชื่อมหมดอายุแล้ว</span>;
  const seconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  return <span>รอเชื่อม · รหัส <b className="font-mono text-teal-700">{code}</b> · เหลือ {minutes}:{String(seconds % 60).padStart(2, "0")} นาที</span>;
}
