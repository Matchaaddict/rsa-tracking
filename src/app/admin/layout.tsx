import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="flex min-h-[80vh]">
      <aside className="w-52 bg-blue-950 text-white flex-shrink-0">
        <div className="p-4 border-b border-blue-800">
          <p className="text-xs text-blue-300 uppercase tracking-widest">ผู้ดูแลระบบ</p>
        </div>
        <nav className="p-3 space-y-1">
          <Link href="/admin" className="block px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors">
            ภาพรวม
          </Link>
          <Link href="/admin/committees" className="block px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors">
            อนุกรรมการ & แนวทาง
          </Link>
          <Link href="/admin/agencies" className="block px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors">
            หน่วยงาน
          </Link>
          <hr className="border-blue-800 my-2" />
          <Link href="/summary" className="block px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors text-blue-300">
            ดูหน้าสรุป
          </Link>
        </nav>
      </aside>
      <div className="flex-1 bg-gray-50 p-6 overflow-auto">{children}</div>
    </div>
  );
}
