"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { ShieldCheck, Building2, LayoutDashboard, FileBarChart2 } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md">
              <ShieldCheck className="text-white" size={18} />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-gray-900 text-sm">RSAT</span>
              <span className="text-gray-400 text-sm ml-1.5">ระบบติดตามข้อเสนอแนวทางฯ</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">แดชบอร์ด</span>
              </Button>
            </Link>
            <Link href="/report">
              <Button variant="ghost" size="sm" className="gap-2">
                <FileBarChart2 size={16} />
                <span className="hidden sm:inline">รายงาน</span>
              </Button>
            </Link>

            {session?.user.role === "admin" && (
              <>
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ShieldCheck size={16} />
                    <span className="hidden sm:inline">แอดมิน</span>
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  ออกจากระบบ
                </Button>
              </>
            )}

            {session?.user.role === "agency" && (
              <>
                <Link href="/agency/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Building2 size={16} />
                    <span className="hidden sm:inline">{session.user.name}</span>
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  ออกจากระบบ
                </Button>
              </>
            )}

            {!session && (
              <div className="flex gap-2">
                <Link href="/agency/login">
                  <Button variant="secondary" size="sm">
                    เข้าสู่ระบบ (หน่วยงาน)
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    แอดมิน
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
