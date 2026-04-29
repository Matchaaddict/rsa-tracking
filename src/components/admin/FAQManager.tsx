"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { FAQMarkdownImporter } from "./FAQMarkdownImporter";
import { Plus, Pencil, Trash2, Loader2, Check, X, Eye, EyeOff, ChevronUp, ChevronDown, Upload } from "lucide-react";

interface FAQ { id: string; question: string; answer: string; published: boolean; orderNum: number; }
const emptyForm = { question: "", answer: "" };

export function FAQManager() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/faqs");
    setFaqs(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editId) {
      await fetch(`/api/admin/faqs/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/admin/faqs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setForm(emptyForm); setEditId(null); setShowForm(false); setSaving(false);
    load();
  }

  async function togglePublish(faq: FAQ) {
    await fetch(`/api/admin/faqs/${faq.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !faq.published }) });
    load();
  }

  async function handleMove(id: string, dir: "up" | "down") {
    const idx = faqs.findIndex((f) => f.id === id);
    const other = dir === "up" ? faqs[idx - 1] : faqs[idx + 1];
    if (!other) return;
    setMoving(true);
    await Promise.all([
      fetch(`/api/admin/faqs/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNum: other.orderNum }) }),
      fetch(`/api/admin/faqs/${other.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNum: faqs[idx].orderNum }) }),
    ]);
    setMoving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบ FAQ นี้?")) return;
    await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-800">จัดการ FAQ</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setShowImporter(true); setShowForm(false); }}>
            <Upload size={14} /> นำเข้าจาก MD
          </Button>
          <Button size="sm" onClick={() => { setShowForm(true); setShowImporter(false); setEditId(null); setForm(emptyForm); }}>
            <Plus size={15} /> เพิ่ม FAQ
          </Button>
        </div>
      </div>

      {showImporter && (
        <FAQMarkdownImporter
          onImported={() => { setShowImporter(false); load(); }}
          onCancel={() => setShowImporter(false)}
        />
      )}

      {showForm && (
        <Card><CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">คำถาม</label>
              <input type="text" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">คำตอบ</label>
              <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {editId ? "บันทึก" : "เพิ่ม"}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={13} /> ยกเลิก
              </Button>
            </div>
          </form>
        </CardContent></Card>
      )}

      {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={22} /></div> : (
        <div className="space-y-2">
          {faqs.length === 0 && <Card><CardContent className="py-8 text-center text-gray-400 text-sm">ยังไม่มี FAQ</CardContent></Card>}
          {faqs.map((faq, idx) => (
            <Card key={faq.id} className={faq.published ? "" : "opacity-60"}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleMove(faq.id, "up")} disabled={moving || idx === 0} className="p-0.5 h-6 w-6">
                      <ChevronUp size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleMove(faq.id, "down")} disabled={moving || idx === faqs.length - 1} className="p-0.5 h-6 w-6">
                      <ChevronDown size={13} />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{faq.question}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => togglePublish(faq)} title={faq.published ? "ซ่อน" : "แสดง"}>
                      {faq.published ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setForm({ question: faq.question, answer: faq.answer }); setEditId(faq.id); setShowForm(true); }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(faq.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
