"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useSyncExternalStore } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Home,
  FileText,
  FileBarChart2,
  Users,
  Building2,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  ChevronDown,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShellInfo } from "@/lib/shellInfo";

export const SEARCH_EVENT = "rsat:search";
export const FOCUS_SEARCH_EVENT = "rsat:focus-search";
const HASH_EVENT = "rsat:hash";

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(HASH_EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(HASH_EVENT, cb);
  };
}

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof Home;
};

function Logo({ className }: { className?: string }) {
  // โลโก้ถนนรูปตัว A — ถนนมุ่งสู่เส้นขอบฟ้า
  // id ต้องไม่ซ้ำ: ถ้าโลโก้อีกตัวถูกซ่อน (display:none) gradient ที่อ้างถึงจะหายไปด้วย
  const gid = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M24 3 L45 45 H33 L24 24 L15 45 H3 Z" fill={`url(#${gid})`} />
      <path d="M24 26 L29 45 H19 Z" fill="#fff" />
      <path d="M24 30 v3 M24 36 v3 M24 42 v2" stroke="#1e3a8a" strokeWidth="1.6" />
    </svg>
  );
}

export function AppShell({
  info,
  children,
}: {
  info: ShellInfo;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");

  const role = session?.user.role;

  const items: NavItem[] = [
    { key: "home", label: "หน้าหลัก", href: "/", icon: Home },
    { key: "proposals", label: "ข้อเสนอแนะ", href: "/#proposals", icon: FileText },
    { key: "report", label: "รายงาน", href: "/report", icon: FileBarChart2 },
    { key: "subcommittees", label: "คณะกรรมการ", href: "/#subcommittees", icon: Users },
    {
      key: "agencies",
      label: "หน่วยงาน",
      href: role === "agency" ? "/agency/dashboard" : "/#agencies",
      icon: Building2,
    },
    { key: "admin", label: "ตั้งค่าระบบ", href: role === "admin" ? "/admin" : "/login", icon: Settings },
  ];

  function isActive(item: NavItem) {
    if (item.key === "admin") return pathname.startsWith("/admin");
    if (item.key === "report") return pathname.startsWith("/report");
    if (item.key === "agencies" && pathname.startsWith("/agency")) return true;
    if (pathname !== "/") return false;
    const h = hash.replace("#", "");
    if (item.key === "home") return h === "" || !["proposals", "subcommittees", "agencies"].includes(h);
    return item.key === h;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: q }));
      window.location.hash = "proposals";
    } else {
      router.push(`/?q=${encodeURIComponent(q)}#proposals`);
    }
  }

  // จอเล็กไม่มีช่องค้นหาบน header — พาไปช่องค้นหาของตารางข้อเสนอแทน
  function openSearch() {
    if (pathname === "/") {
      window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
    } else {
      router.push("/#proposals");
    }
  }

  const lastUpdated = info.lastUpdated
    ? new Date(info.lastUpdated).toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#0b1d4d] via-[#0d2361] to-[#0a1a45] text-white">
      {/* night city silhouette */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 w-full opacity-40"
        viewBox="0 0 260 300"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="sb-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e3a8a" stopOpacity="0" />
            <stop offset="1" stopColor="#1e40af" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="sb-road" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 170 h18 v-40 h14 v25 h10 v-60 h16 v75 h12 v-30 h20 v-45 h10 v-15 h8 v60 h14 v-20 h18 v-50 h14 v70 h16 v-35 h12 v45 h20 v-55 h16 v65 h12 v-25 h10 V300 H0 Z"
          fill="url(#sb-fade)"
        />
        <path d="M-10 290 C 80 230, 150 250, 270 190" stroke="url(#sb-road)" strokeWidth="3" fill="none" />
        <path d="M-10 300 C 90 250, 160 270, 270 215" stroke="url(#sb-road)" strokeWidth="1.5" fill="none" opacity="0.7" />
      </svg>

      <Link href="/" className="relative flex items-center gap-3 px-6 pt-6 pb-8">
        <Logo className="h-11 w-11 shrink-0" />
        <div className="leading-tight">
          <p className="text-xl font-bold tracking-wide">RSAT</p>
          <p className="text-[11px] text-blue-200">Road Safety</p>
          <p className="text-[11px] text-blue-200">Actions Tracking</p>
        </div>
      </Link>

      <nav className="relative flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={(e) => {
                setMobileOpen(false);
                if (pathname !== "/" || (item.key !== "home" && !item.href.startsWith("/#"))) return;
                // อยู่หน้าแรกอยู่แล้ว — เปลี่ยน hash เอง เพื่อให้ hashchange ยิงไปถึง PublicDashboard
                e.preventDefault();
                if (item.key === "home") {
                  history.pushState(null, "", "/");
                  window.dispatchEvent(new Event(HASH_EVENT));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  window.location.hash = item.href.slice(2);
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/40"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative px-4 pb-4">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
          <ShieldCheck size={34} className="text-white" strokeWidth={1.6} />
          <p className="mt-3 text-lg font-bold leading-snug">
            ร่วมสร้าง
            <br />
            ถนนปลอดภัย
            <br />
            เพื่อคนไทยทุกคน
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
          </div>
        </div>
        <div className="mt-4 space-y-0.5 px-1 text-[11px] text-blue-200/80">
          <p>ข้อมูลล่าสุด</p>
          <p className="text-blue-100">{lastUpdated}</p>
          <p>เวอร์ชัน {info.version}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 print:hidden lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">
            {sidebar}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/80 hover:bg-white/10"
              aria-label="ปิดเมนู"
            >
              <X size={20} />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-60 print:pl-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur print:hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="เปิดเมนู"
            >
              <Menu size={22} />
            </button>
            <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:hidden" aria-label="RSAT หน้าหลัก">
              <Logo className="h-7 w-7" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-[#0b1d4d] sm:hidden">RSAT</p>
              <h1 className="truncate text-[11px] leading-snug text-slate-500 sm:hidden" title={info.title}>
                {info.title}
              </h1>
              <h1 className="hidden sm:line-clamp-2 text-balance font-bold leading-snug text-[#0b1d4d] sm:text-lg xl:text-2xl">
                {info.title}
              </h1>
              <p className="mt-0.5 hidden truncate text-xs text-slate-500 md:block xl:text-sm" title={info.subtitle}>
                {info.subtitle}
              </p>
            </div>

            <button
              onClick={openSearch}
              className="shrink-0 rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:text-blue-600 xl:hidden"
              aria-label="ค้นหา"
            >
              <Search size={18} />
            </button>
            <form onSubmit={submitSearch} className="relative hidden shrink-0 xl:block">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาข้อมูล..."
                className="w-56 rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 2xl:w-64"
              />
            </form>

            {session && (
              <Link
                href={role === "admin" ? "/admin" : "/agency/dashboard"}
                className="relative hidden shrink-0 rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:text-blue-600 md:block"
                aria-label="การแจ้งเตือน"
              >
                <Bell size={18} />
              </Link>
            )}

            {session ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow">
                    <UserCircle2 size={24} />
                  </span>
                  <span className="hidden text-left leading-tight lg:block">
                    <span className="block max-w-[9rem] truncate text-sm font-semibold text-slate-800">
                      {session.user.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {role === "admin" ? "ผู้ดูแลระบบ" : "หน่วยงาน"}
                    </span>
                  </span>
                  <ChevronDown size={16} className="hidden text-slate-500 lg:block" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
                    <Link
                      href={role === "admin" ? "/admin" : "/agency/dashboard"}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {role === "admin" ? <Settings size={15} /> : <Building2 size={15} />}
                      {role === "admin" ? "จัดการระบบ" : "แดชบอร์ดหน่วยงาน"}
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: window.location.origin + "/" })}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={15} /> ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/agency/login"
                  className="whitespace-nowrap rounded-full bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 sm:text-sm"
                >
                  <span className="2xl:hidden">เข้าสู่ระบบ</span>
                  <span className="hidden 2xl:inline">เข้าสู่ระบบ (หน่วยงาน)</span>
                </Link>
                <Link
                  href="/login"
                  className="hidden whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 xl:block"
                >
                  แอดมิน
                </Link>
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
