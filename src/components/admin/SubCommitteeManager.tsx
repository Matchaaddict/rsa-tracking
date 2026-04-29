"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";

interface SubCommittee {
  id: string;
  name: string;
  description: string | null;
  _count?: { agencies: number; proposals: number };
}

const emptyForm = { name: "", description: "" };

export function SubCommitteeManager() {
  const [items, setItems] = useState<SubCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/subcommittees");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editId ? `/api/admin/subcommittees/${editId}` : "/api/admin/subcommittees";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`บันทึกไม่สำเร็จ: ${err.error ?? res.status}`);
      setSubmitting(false);
      return;
    }
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบอนุกรรมการนี้? หน่วยงานและข้อเสนอที่อยู่ในอนุกรรมการนี้จะถูกตัดความเชื่อมโยงด้วย")) return;
    const res = await fetch(`/api/admin/subcommittees/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`ลบไม่สำเร็จ: ${err.error ?? res.status}`);
      return;
    }
    load();
  }

  function startEdit(item: SubCommittee) {
    setForm({ name: item.name, description: item.description || "" });
    setEditId(item.id);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">จัดการอนุกรรมการ ({items.length} คณะ)</h2>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> เพิ่มอนุกรรมการ
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ชื่ออนุกรรมการ</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น อนุกรรมการด้านการจราจร"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">รายละเอียด (ไม่บังคับ)</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editId ? "บันทึก" : "เพิ่ม"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                >
                  <X size={14} /> ยกเลิก
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-400">ยังไม่มีอนุกรรมการ</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {item.description && (
                    <span className="ml-2 text-sm text-gray-500">{item.description}</span>
                  )}
                  {item._count && (
                    <span className="ml-2 text-xs text-gray-400">
                      {item._count.agencies} หน่วยงาน · {item._count.proposals} ข้อเสนอ
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
