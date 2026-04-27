"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, HelpCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AgencyLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState("");

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotSending(true); setForgotError("");
    const res = await fetch("/api/public/reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: forgotUsername }),
    });
    const data = await res.json();
    setForgotSending(false);
    if (!res.ok) { setForgotError(data.error || "เกิดข้อผิดพลาด"); return; }
    setForgotDone(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("agency", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    } else {
      router.push("/agency/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 className="text-white" size={24} />
            </div>
          </div>
          <CardTitle>เข้าสู่ระบบหน่วยงาน</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            กรอก Username / Password ที่ได้รับจากแอดมิน
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อผู้ใช้ (Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center">
            <Link href="/agency/first-time"
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mx-auto justify-center">
              <Sparkles size={13} /> เข้าใช้งานครั้งแรก? คลิกที่นี่
            </Link>
            <button onClick={() => { setShowForgot(!showForgot); setForgotDone(false); setForgotError(""); }}
              className="text-sm text-gray-400 hover:text-emerald-600 flex items-center gap-1 mx-auto">
              <HelpCircle size={13} /> ลืมรหัสผ่าน?
            </button>

            {showForgot && (
              <div className="text-left bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
                {forgotDone ? (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    ✓ ส่งคำขอรีเซ็ตรหัสผ่านแล้ว แอดมินจะติดต่อกลับมาเร็วๆ นี้
                  </p>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-3">
                    <p className="text-xs text-gray-500">กรอก username ของหน่วยงาน แอดมินจะสร้างรหัสผ่านใหม่ให้</p>
                    <input type="text" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)}
                      placeholder="ชื่อผู้ใช้ (username)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required />
                    {forgotError && <p className="text-xs text-red-600">{forgotError}</p>}
                    <Button type="submit" size="sm" disabled={forgotSending} className="bg-emerald-600 hover:bg-emerald-700">
                      {forgotSending ? "กำลังส่ง..." : "ส่งคำขอรีเซ็ต"}
                    </Button>
                  </form>
                )}
              </div>
            )}

            <p className="text-sm text-gray-500">
              <Link href="/" className="text-emerald-600 hover:underline">กลับหน้าแดชบอร์ด</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
