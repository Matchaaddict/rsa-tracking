"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { FESTIVAL_TYPE_LABELS } from "@/lib/utils";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";

interface Festival {
  id: string;
  name: string;
  type: string;
  year: number;
  _count?: { proposals: number };
}

const emptyForm = { name: "", type: "NEW_YEAR", year: new Date().getFullYear() - 2500 + 43 };

export function FestivalManager() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/festivals");
    setFestivals(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editId ? `/api/admin/festivals/${editId}` : "/api/admin/festivals";
    const method = editId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบเทศกาลนี้? ข้อเสนอทั้งหมดที่เกี่ยวข้องจะถูกลบด้วย")) return;
    await fetch(`/api/admin/festivals/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(f: Festival) {
    setForm({ name: f.name, type: f.type, year: f.year });
    setEditId(f.id);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">จัดการเทศกาล</h2>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> เพิ่มเทศกาล
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ชื่อเทศกาล</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น ปีใหม่ 68"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ประเภท</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NEW_YEAR">ปีใหม่</option>
                    <option value="SONGKRAN">สงกรานต์</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ปี (พ.ศ.)</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
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
      ) : festivals.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-400">ยังไม่มีเทศกาล</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {festivals.map((f) => (
            <Card key={f.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{f.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({FESTIVAL_TYPE_LABELS[f.type]} | ปี {f.year})
                  </span>
                  {f._count && (
                    <span className="ml-2 text-xs text-gray-400">{f._count.proposals} ข้อเสนอ</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(f)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(f.id)}>
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
