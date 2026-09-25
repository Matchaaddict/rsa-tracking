"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, Pencil, Trash2, Check, X, Hash, ExternalLink } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  description: string | null;
  _count: { proposals: number };
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ประเด็นถูกสร้างจากฟอร์มเรื่องที่ติดตาม — หน้านี้ไว้แก้ชื่อ เพิ่มคำอธิบาย รวม หรือลบ
export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setTags(d);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [version]);

  async function save(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      alert((await res.json().catch(() => null))?.error ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setEditId(null);
    load();
  }

  async function remove(t: Tag) {
    if (!confirm(`ลบประเด็น "${t.name}"? (เรื่องที่ติดตาม ${t._count.proposals} เรื่องจะไม่ถูกลบ แค่เอาแท็กออก)`)) return;
    await fetch(`/api/admin/tags/${t.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">ประเด็น</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          ประเด็นถูกสร้างตอนติดแท็กในเรื่องที่ติดตาม เช่น #ทางข้าม — แต่ละประเด็นมีหน้ารวมเรื่องจากทุกที่มา
          ถ้าแก้ชื่อให้ตรงกับประเด็นที่มีอยู่แล้ว ระบบจะรวมเป็นประเด็นเดียวกัน
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            ยังไม่มีประเด็น — ติดแท็กได้ในฟอร์มแท็บ &ldquo;เรื่องที่ติดตาม&rdquo;
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tags.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-3">
                {editId === t.id ? (
                  <div className="space-y-2">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls}
                      placeholder="ชื่อประเด็น"
                    />
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className={inputCls}
                      placeholder="คำอธิบาย (แสดงบนหน้าประเด็น)"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => save(t.id)} disabled={saving}>
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} บันทึก
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>
                        <X size={13} /> ยกเลิก
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-medium text-gray-900">
                        <Hash size={14} className="text-blue-500" />
                        {t.name}
                        <span className="ml-1 text-xs font-normal text-gray-400">{t._count.proposals} เรื่อง</span>
                      </p>
                      {t.description && <p className="text-sm text-gray-500 mt-0.5 break-words">{t.description}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Link href={`/topics/${t.id}`} target="_blank">
                        <Button variant="ghost" size="sm" aria-label="เปิดหน้าประเด็น"><ExternalLink size={14} /></Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="แก้ไข"
                        onClick={() => { setEditId(t.id); setForm({ name: t.name, description: t.description ?? "" }); }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button variant="danger" size="sm" aria-label="ลบ" onClick={() => remove(t)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
