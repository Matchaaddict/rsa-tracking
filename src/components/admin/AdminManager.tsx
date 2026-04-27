"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Trash2, Loader2, Check, X, RefreshCw, ShieldCheck } from "lucide-react";

const ALL_TABS = [
  { id: "festivals",     label: "จัดการวาระ" },
  { id: "subcommittees", label: "จัดการอนุกรรมการ" },
  { id: "agencies",      label: "จัดการหน่วยงาน" },
  { id: "proposals",     label: "จัดการข้อเสนอ" },
  { id: "analysis",      label: "วิเคราะห์ความคืบหน้า" },
  { id: "siteconfig",    label: "ตั้งค่าหน้าเว็บ" },
  { id: "faq",           label: "จัดการ FAQ" },
  { id: "messages",      label: "ดูและตอบข้อความ" },
] as const;

function generatePassword(length = 10) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

interface AdminUser {
  id: string;
  username: string;
  isSuperAdmin: boolean;
  permissions: string;
  createdAt: string;
}

export function AdminManager({ currentAdminId }: { currentAdminId: string }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: generatePassword(), permissions: [] as string[] });
  const [resetPass, setResetPass] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/admin/admins");
    setAdmins(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function togglePerm(tabId: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(tabId)
        ? f.permissions.filter((p) => p !== tabId)
        : [...f.permissions, tabId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (editId) {
      await fetch(`/api/admin/admins/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: form.permissions }),
      });
    } else {
      await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSubmitting(false);
    setShowForm(false);
    setEditId(null);
    setForm({ username: "", password: generatePassword(), permissions: [] });
    load();
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`ลบแอดมิน "${username}"?`)) return;
    await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    load();
  }

  async function handleResetPassword(id: string) {
    const newPass = generatePassword();
    await fetch(`/api/admin/admins/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    setResetPass((r) => ({ ...r, [id]: newPass }));
  }

  function startEdit(a: AdminUser) {
    const perms = JSON.parse(a.permissions) as string[];
    setForm({ username: a.username, password: "", permissions: perms });
    setEditId(a.id);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">จัดการแอดมิน</h2>
          <p className="text-sm text-gray-500 mt-0.5">เพิ่มแอดมินและกำหนดสิทธิ์การเข้าถึงแต่ละส่วน</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({ username: "", password: generatePassword(), permissions: [] }); }}>
          <Plus size={14} /> เพิ่มแอดมิน
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Username</label>
                    <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Password เริ่มต้น</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        required />
                      <Button type="button" variant="secondary" size="sm" onClick={() => setForm({ ...form, password: generatePassword() })}>
                        <RefreshCw size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">สิทธิ์การเข้าถึง (ติ๊กเลือก)</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_TABS.map((tab) => (
                    <label key={tab.id} className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(tab.id)}
                        onChange={() => togglePerm(tab.id)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{tab.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {editId ? "บันทึก" : "เพิ่มแอดมิน"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); setEditId(null); }}>
                  <X size={13} /> ยกเลิก
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => {
            const perms = JSON.parse(a.permissions) as string[];
            const permLabels = ALL_TABS.filter((t) => perms.includes(t.id)).map((t) => t.label);
            const newPass = resetPass[a.id];
            return (
              <Card key={a.id}>
                <CardContent className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{a.username}</p>
                      {a.isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          <ShieldCheck size={11} /> Super Admin
                        </span>
                      )}
                      {a.id === currentAdminId && (
                        <span className="text-xs text-gray-400">(คุณ)</span>
                      )}
                    </div>
                    {!a.isSuperAdmin && (
                      <p className="text-xs text-gray-500 mt-1">
                        {permLabels.length === 0
                          ? "ยังไม่มีสิทธิ์"
                          : permLabels.join(" · ")}
                      </p>
                    )}
                    {newPass && (
                      <p className="text-xs mt-1 font-mono bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded">
                        รหัสผ่านใหม่: {newPass}
                      </p>
                    )}
                  </div>
                  {!a.isSuperAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(a)}>แก้สิทธิ์</Button>
                      <Button variant="secondary" size="sm" onClick={() => handleResetPassword(a.id)} title="รีเซ็ตรหัสผ่าน">
                        <RefreshCw size={13} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(a.id, a.username)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
