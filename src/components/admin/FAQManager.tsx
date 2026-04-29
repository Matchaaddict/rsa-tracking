"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Pencil, Trash2, Loader2, Check, X, Eye, EyeOff, ChevronUp, ChevronDown, Upload } from "lucide-react";

interface FAQ { id: string; question: string; answer: string; published: boolean; orderNum: number; }
const emptyForm = { question: "", answer: "" };

export function FAQManager() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importText.trim()) return;
    if (importMode === "replace" && !confirm("จะลบ FAQ เดิมทั้งหมดก่อน import — ยืนยัน?")) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/faqs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: importText, mode: importMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportResult(`ผิดพลาด: ${data.error ?? "ไม่ทราบสาเหตุ"}`);
      } else {
        setImportResult(`สำเร็จ — เพิ่ม ${data.created} ข้อ, ข้าม ${data.skipped} ข้อ (ซ้ำ) จากทั้งหมด ${data.total} ข้อ`);
        setImportText("");
        load();
      }
    } finally {
      setImporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

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
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">จัดการ FAQ</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setShowImport(true); setImportResult(null); }}>
            <Upload size={15} /> Import จาก Markdown
          </Button>
          <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>
            <Plus size={15} /> เพิ่ม FAQ
          </Button>
        </div>
      </div>

      {showImport && (
        <Card><CardContent className="pt-4">
          <form onSubmit={handleImport} className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-800 mb-1">Import FAQ จาก Markdown</h3>
              <p className="text-xs text-gray-500">
                ใช้ <code className="bg-gray-100 px-1">## คำถาม</code> เป็นหัวข้อ และเนื้อหาด้านล่างเป็นคำตอบ (เลข นำหน้าเช่น &quot;1.&quot; ระบบจะตัดออกให้)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">เลือกไฟล์ .md</label>
              <input type="file" accept=".md,.markdown,text/markdown,text/plain" onChange={handleFileChange}
                className="text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">หรือวางเนื้อหา markdown</label>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={10}
                placeholder={"## คำถามแรก\n\nคำตอบ...\n\n## คำถามที่สอง\n\nคำตอบ..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">โหมด</label>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={importMode === "append"} onChange={() => setImportMode("append")} />
                  เพิ่มต่อท้าย (ข้ามคำถามที่ซ้ำ)
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={importMode === "replace"} onChange={() => setImportMode("replace")} />
                  ลบทั้งหมดแล้ว import ใหม่
                </label>
              </div>
            </div>
            {importResult && (
              <div className={`text-sm px-3 py-2 rounded-lg ${importResult.startsWith("สำเร็จ") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {importResult}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={importing || !importText.trim()}>
                {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Import
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => { setShowImport(false); setImportText(""); setImportResult(null); }}>
                <X size={13} /> ปิด
              </Button>
            </div>
          </form>
        </CardContent></Card>
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
