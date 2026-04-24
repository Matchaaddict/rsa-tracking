"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, KeyRound, ShieldAlert, Check } from "lucide-react";

export function AgencyPasswordChange() {
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/agency/password")
      .then((r) => r.json())
      .then((d) => { setIsDefault(d.isDefaultPassword); setLoading(false); });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("รหัสผ่านใหม่ไม่ตรงกัน"); return; }
    if (newPassword.length < 6) { setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
    setSaving(true);
    const res = await fetch("/api/agency/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
    setSuccess(true);
    setIsDefault(false);
    setCurrentPassword(""); setNewPassword(""); setConfirm("");
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <KeyRound size={20} className="text-emerald-600" />
        <h2 className="text-xl font-bold text-gray-900">เปลี่ยนรหัสผ่าน</h2>
      </div>

      {isDefault && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">แนะนำ: เปลี่ยนรหัสผ่านก่อนใช้งาน</p>
            <p className="text-xs text-amber-600 mt-0.5">คุณยังใช้รหัสผ่านชั่วคราวที่ได้รับจากแอดมิน ควรเปลี่ยนเป็นรหัสผ่านส่วนตัวเพื่อความปลอดภัย</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <Check size={16} className="text-green-600" />
          <p className="text-sm text-green-700 font-medium">เปลี่ยนรหัสผ่านสำเร็จ</p>
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">รหัสผ่านปัจจุบัน</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required autoComplete="current-password" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required minLength={6} autoComplete="new-password" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              เปลี่ยนรหัสผ่าน
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
