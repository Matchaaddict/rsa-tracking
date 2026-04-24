import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

export default async function NavBar() {
  const session = await auth();
  const user = session?.user as { name?: string; isAdmin?: boolean } | undefined;

  return (
    <nav className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
      <Link href="/" className="font-bold text-lg tracking-wide">
        ศปถ. ติดตามผลการดำเนินงาน
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/summary" className="hover:text-blue-200 transition-colors">
          สรุปภาพรวม
        </Link>
        {user ? (
          <>
            {user.isAdmin ? (
              <Link href="/admin" className="hover:text-blue-200 transition-colors">
                จัดการระบบ
              </Link>
            ) : (
              <Link href="/dashboard" className="hover:text-blue-200 transition-colors">
                รายงานผล
              </Link>
            )}
            <span className="text-blue-300">|</span>
            <span className="text-blue-200">{user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded text-sm transition-colors">
                ออกจากระบบ
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded transition-colors">
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </nav>
  );
}
