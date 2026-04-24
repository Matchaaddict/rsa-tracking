"use client";

import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, Check, KeyRound, Eye, EyeOff } from "lucide-react";

export function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setMessage({ type: "success", text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setMessage({ type: "error", text: data.error || "เกิดข้อผิดพลาด" });
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <KeyRound size={18} /> เปลี่ยนรหัสผ่านแอดมิน
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                รหัสผ่านปัจจุบัน
              </label>
              <input
                type={show ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                รหัสผ่านใหม่
              </label>
              <input
                type={show ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type={show ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
                className="rounded"
              />
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
              แสดงรหัสผ่าน
            </label>

            {message && (
              <div
                className={`px-3 py-2 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              เปลี่ยนรหัสผ่าน
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
