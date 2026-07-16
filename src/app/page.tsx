import { ArrowRight, Building2, ChartNoAxesCombined, ReceiptText, Wrench } from "lucide-react";

const features = [
  [Building2, "จัดการห้องพัก", "ดูสถานะห้อง ผู้เช่า และสัญญาเช่าในที่เดียว"],
  [ReceiptText, "ออกบิลอัตโนมัติ", "คำนวณค่าเช่า ค่าน้ำ และค่าไฟอย่างแม่นยำ"],
  [ChartNoAxesCombined, "เห็นภาพรวมทันที", "ติดตามรายรับ ยอดค้าง และงานสำคัญของวันนี้"],
  [Wrench, "แจ้งซ่อมเป็นระบบ", "รับเรื่อง มอบหมาย และติดตามสถานะงานซ่อม"],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10 lg:px-20">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white"><Building2 size={21} /></span>Home Apartment</div>
        <a href="/login" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">เข้าสู่ระบบ</a>
      </nav>
      <section className="mx-auto grid max-w-6xl gap-10 py-20 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
        <div><p className="mb-4 font-semibold text-teal-700">จัดการง่ายขึ้นทุกวัน</p><h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">ระบบบริหารอพาร์ตเมนต์ สำหรับครอบครัว</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">ลดงานกระดาษ คิดค่าใช้จ่ายอัตโนมัติ และเห็นทุกเรื่องสำคัญของห้องพักได้จากหน้าจอเดียว</p><a href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white shadow-sm">เริ่มต้นใช้งาน <ArrowRight size={18} /></a></div>
        <div className="rounded-3xl bg-slate-900 p-7 text-white shadow-xl"><p className="text-slate-300">ภาพรวมวันนี้</p><p className="mt-2 text-4xl font-bold">40 ห้อง</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/10 p-4"><b className="text-2xl">25</b><br/><span className="text-sm text-slate-300">มีผู้เช่า</span></div><div className="rounded-xl bg-white/10 p-4"><b className="text-2xl">15</b><br/><span className="text-sm text-slate-300">ห้องว่าง</span></div></div></div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(([Icon, title, detail]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><Icon className="text-teal-600"/><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></article>)}</section>
    </main>
  );
}
