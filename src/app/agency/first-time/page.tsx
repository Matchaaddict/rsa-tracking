"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Search, Loader2, Copy, Check, KeyRound, ArrowLeft, ShieldAlert, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface AgencyItem {
  id: string;
  name: string;
  passwordChangedByAgency: boolean;
}

interface Credentials {
  name: string;
  username?: string;
  password?: string;
  changed: boolean;
  noPassword?: boolean;
}

export default function FirstTimePage() {
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/first-time")
      .then((r) => r.json())
      .then((d) => { setAgencies(d); setLoading(false); });
  }, []);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setCredLoading(true);
    setError("");
    setCreds(null);
    const res = await fetch(`/api/public/first-time/${id}`);
    const data = await res.json();
    setCredLoading(false);
    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
    setCreds(data);
  }

  function copy(text: string, kind: "user" | "pass") {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  function reset() {
    setSelectedId(null);
    setCreds(null);
    setError("");
  }

  const filtered = agencies.filter((a) =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedId && (creds || credLoading || error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 mb-2">
              <ArrowLeft size={14} /> เลือกหน่วยงานอื่น
            </button>
            <CardTitle>{creds?.name || "กำลังโหลด..."}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {credLoading && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {creds?.changed && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">หน่วยงานนี้เปลี่ยนรหัสผ่านไปแล้ว</p>
                    <p className="text-xs text-amber-600 mt-1">โปรดใช้รหัสผ่านที่หน่วยงานตั้งไว้ หากลืมรหัส กรุณาติดต่อแอดมินเพื่อขอรีเซ็ต</p>
                  </div>
                </div>
                <Link href="/agency/login" className="block">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    ไปหน้าเข้าสู่ระบบ
                  </Button>
                </Link>
              </div>
            )}

            {creds?.noPassword && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">ยังไม่ได้ตั้งรหัสผ่านเริ่มต้น</p>
                  <p className="text-xs text-amber-600 mt-1">กรุณาติดต่อแอดมินเพื่อขอรหัสผ่าน</p>
                </div>
              </div>
            )}

            {creds?.username && creds?.password && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-emerald-700 mb-1">Username</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-base font-semibold text-gray-900 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                        {creds.username}
                      </code>
                      <button onClick={() => copy(creds.username!, "user")}
                        className="p-2 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50">
                        {copied === "user" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-gray-500" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700 mb-1">Password (ชั่วคราว)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-base font-semibold text-gray-900 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                        {creds.password}
                      </code>
                      <button onClick={() => copy(creds.password!, "pass")}
                        className="p-2 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50">
                        {copied === "pass" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-gray-500" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <KeyRound size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    หลังเข้าสู่ระบบครั้งแรก โปรด<span className="font-semibold">เปลี่ยนรหัสผ่าน</span>ที่เมนู &quot;เปลี่ยนรหัสผ่าน&quot; ในหน้าหน่วยงาน เพื่อความปลอดภัย
                  </p>
                </div>

                <Link href="/agency/login" className="block">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    ไปหน้าเข้าสู่ระบบ
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 className="text-white" size={24} />
            </div>
          </div>
          <CardTitle>เข้าใช้งานครั้งแรก</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            เลือกหน่วยงานของท่าน เพื่อรับ Username และรหัสผ่านชั่วคราว
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาหน่วยงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">ไม่พบหน่วยงาน</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelect(a.id)}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-gray-800">{a.name}</span>
                  {a.passwordChangedByAgency && (
                    <span className="text-xs text-green-600 shrink-0">✓ เปลี่ยนรหัสแล้ว</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="text-center mt-4 space-y-1">
            <p className="text-sm text-gray-500">
              มีรหัสอยู่แล้ว? <Link href="/agency/login" className="text-emerald-600 hover:underline">เข้าสู่ระบบ</Link>
            </p>
            <p className="text-sm text-gray-500">
              <Link href="/" className="text-gray-400 hover:text-emerald-600">กลับหน้าแดชบอร์ด</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
