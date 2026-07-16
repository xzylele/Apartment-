import { Building2 } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-5"><section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"><div className="mb-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-teal-600 text-white"><Building2 /></span><h1 className="mt-4 text-2xl font-bold">ยินดีต้อนรับ</h1><p className="mt-2 text-sm text-slate-500">เข้าสู่ระบบ Home Apartment Manager</p></div><LoginForm /></section></main>;
}
