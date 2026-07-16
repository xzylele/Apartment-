"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export function RoomFilter() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const applyFilter = (nextQuery: string, nextStatus: string) => {
    document.querySelectorAll<HTMLTableRowElement>("[data-room]").forEach((row) => {
      const text = row.dataset.room?.toLowerCase() ?? "";
      const roomStatus = row.dataset.status ?? "";
      row.hidden = !(text.includes(nextQuery.toLowerCase()) && (nextStatus === "all" || roomStatus === nextStatus));
    });
  };
  return <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(event) => { setQuery(event.target.value); applyFilter(event.target.value, status); }} placeholder="ค้นหาเลขห้องหรือประเภทห้อง" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"/></label><select value={status} onChange={(event) => { setStatus(event.target.value); applyFilter(query, event.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">ทุกสถานะ</option><option value="vacant">ห้องว่าง</option><option value="occupied">มีผู้เช่า</option><option value="maintenance">ซ่อมบำรุง</option></select></div>;
}
