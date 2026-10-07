"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { festIcon, festTheme, cn } from "@/lib/utils";
import { KIND_META, SOURCE_KINDS, sourceKind, sourceLabel, type SourceKind } from "@/lib/tracking";
import { Check, ChevronDown, ChevronUp, ExternalLink, Loader2, NotebookPen, Pencil, Search, Trash2, X } from "lucide-react";

interface Source {
  id: string;
  name: string;
  type: string;
  year: number;
}

interface Item {
  id: string;
  title: string;
  orderNumber: number;
  festivalId: string;
  festival: Source;
  subCommittees: { subCommittee: { id: string; name: string } }[];
}

interface Note {
  id: string;
  proposalId: string;
  content: string;
  sourceUrl: string | null;
  authorLabel: string;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const thDateTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const scShort = (name: string) => {
  const n = name.match(/^C(\d+)/)?.[1];
  return n ? `อนุฯ ${n}` : name;
};

// บันทึกความเคลื่อนไหวจากฝ่ายเลขานุการฯ — ใช้ได้กับทุกเรื่อง ไม่เปลี่ยนสถานะ ไม่นับ %
export function NotesManager({ adminId, isSuperAdmin }: { adminId: string; isSuperAdmin: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  const [kind, setKind] = useState<SourceKind | "ALL">("ALL");
  const [sourceId, setSourceId] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyWithNotes, setOnlyWithNotes] = useState(false);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const [draft, setDraft] = useState({ content: "", sourceUrl: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/admin/proposals").then((r) => r.json()),
      fetch("/api/admin/festivals").then((r) => r.json()),
      fetch("/api/admin/notes").then((r) => r.json()),
    ]).then(([ps, fs, ns]) => {
      if (!alive) return;
      setItems(Array.isArray(ps) ? ps : []);
      setSources(Array.isArray(fs) ? fs : []);
      setNotes(Array.isArray(ns) ? ns : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [version]);

  const notesOf = (id: string) => notes.filter((n) => n.proposalId === id);
  const kinds = SOURCE_KINDS.filter((k) => sources.some((s) => sourceKind(s.type) === k));
  const q = query.trim().toLowerCase();
  const filtered = items.filter((it) => {
    if (kind !== "ALL" && sourceKind(it.festival.type) !== kind) return false;
    if (sourceId !== "all" && it.festivalId !== sourceId) return false;
    if (onlyWithNotes && notesOf(it.id).length === 0) return false;
    if (q && !it.title.toLowerCase().includes(q) && !sourceLabel(it.festival).toLowerCase().includes(q)) return false;
    return true;
  });
  // เรียงตามที่มา (ปีล่าสุดก่อน) แล้วตามเลขข้อ — ข้อ 1 ของต่างวาระไม่ปนกัน
  const sourceRank = new Map(sources.map((s, i) => [s.id, i]));
  filtered.sort(
    (a, b) => (sourceRank.get(a.festivalId) ?? 999) - (sourceRank.get(b.festivalId) ?? 999) || a.orderNumber - b.orderNumber
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pageCount - 1);
  const rows = filtered.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);

  function openItem(id: string) {
    setOpenId(openId === id ? null : id);
    setDraft({ content: "", sourceUrl: "" });
    setEditId(null);
    setError("");
  }

  async function save(proposalId: string) {
    setSaving(true);
    setError("");
    const res = await fetch(editId ? `/api/admin/notes/${editId}` : "/api/admin/notes", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, ...draft }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setDraft({ content: "", sourceUrl: "" });
    setEditId(null);
    reload();
  }

  async function remove(n: Note) {
    if (!confirm("ลบบันทึกนี้?")) return;
    await fetch(`/api/admin/notes/${n.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <NotebookPen size={18} /> บันทึกความเคลื่อนไหว
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          บันทึกข้อมูลที่พบจากการประชุม เพจ Facebook หรือเว็บไซต์ ลงในเรื่องใดก็ได้ — แสดงบนหน้าสาธารณะใต้เรื่องนั้นในนามฝ่ายเลขานุการฯ
          <span className="font-medium text-gray-700"> ไม่เปลี่ยนสถานะ และไม่นับรวมใน % ความคืบหน้า</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {kinds.length > 1 &&
          (["ALL", ...kinds] as const).map((k) => (
            <button
              key={k}
              onClick={() => { setKind(k); setSourceId("all"); setPage(0); }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                kind === k ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {k === "ALL" ? "ทุกประเภท" : `${KIND_META[k].icon} ${KIND_META[k].label}`}
            </button>
          ))}
        <select
          value={sourceId}
          onChange={(e) => { setSourceId(e.target.value); setPage(0); }}
          className="max-w-full rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">ทุกที่มา</option>
          {sources
            .filter((s) => kind === "ALL" || sourceKind(s.type) === kind)
            .map((s) => (
              <option key={s.id} value={s.id}>{sourceLabel(s)}</option>
            ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" checked={onlyWithNotes} onChange={(e) => { setOnlyWithNotes(e.target.checked); setPage(0); }} className="accent-blue-600" />
          เฉพาะเรื่องที่มีบันทึก
        </label>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="ค้นหาเรื่องหรือที่มา..."
          className={cn(inputCls, "pl-9")}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-400">ไม่พบเรื่อง</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((it) => {
            const list = notesOf(it.id);
            const open = openId === it.id;
            return (
              <Card key={it.id}>
                <button onClick={() => openItem(it.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-400">ข้อ {it.orderNumber}</span>
                      <Badge variant={festTheme(it.festival.type).badgeVariant}>
                        {festIcon(it.festival.type)} {sourceLabel(it.festival)}
                      </Badge>
                      {it.subCommittees.map((s) => (
                        <Badge key={s.subCommittee.id} variant="gray">{scShort(s.subCommittee.name)}</Badge>
                      ))}
                      {list.length > 0 && <Badge variant="success">บันทึก {list.length}</Badge>}
                    </div>
                    <p className="break-words font-medium text-gray-900">{it.title}</p>
                  </div>
                  {open ? <ChevronUp size={16} className="mt-1 shrink-0 text-blue-500" /> : <ChevronDown size={16} className="mt-1 shrink-0 text-gray-400" />}
                </button>

                {open && (
                  <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                    <div className="space-y-2 rounded-lg border border-teal-100 bg-teal-50/50 p-3">
                      <textarea
                        rows={3}
                        value={draft.content}
                        onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                        placeholder="เช่น ที่ประชุมคณะทำงานวันที่ 3 ต.ค. 69 แจ้งว่ากรมทางหลวงเริ่มติดตั้งไฟส่องสว่างจุดเสี่ยงแล้ว 12 จุด"
                        className={cn(inputCls, "bg-white")}
                      />
                      <input
                        type="url"
                        value={draft.sourceUrl}
                        onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })}
                        placeholder="ลิงก์แหล่งข้อมูล (ถ้ามี) — โพสต์ Facebook, ข่าว, เว็บไซต์"
                        className={cn(inputCls, "bg-white")}
                      />
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => save(it.id)} disabled={saving || !draft.content.trim()}>
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          {editId ? "บันทึกการแก้ไข" : "เพิ่มบันทึก"}
                        </Button>
                        {editId && (
                          <Button size="sm" variant="secondary" onClick={() => { setEditId(null); setDraft({ content: "", sourceUrl: "" }); }}>
                            <X size={13} /> ยกเลิก
                          </Button>
                        )}
                      </div>
                    </div>

                    {list.length === 0 ? (
                      <p className="text-sm text-gray-400">ยังไม่มีบันทึก</p>
                    ) : (
                      <ol className="space-y-2">
                        {list.map((n) => {
                          const mine = n.authorId === adminId || isSuperAdmin;
                          return (
                            <li key={n.id} className="rounded-lg border border-gray-100 bg-white p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium text-teal-700">{n.authorLabel}</span> · {thDateTime(n.createdAt)}
                                </p>
                                {mine && (
                                  <div className="flex shrink-0 gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      aria-label="แก้ไข"
                                      onClick={() => { setEditId(n.id); setDraft({ content: n.content, sourceUrl: n.sourceUrl ?? "" }); }}
                                    >
                                      <Pencil size={12} />
                                    </Button>
                                    <Button variant="ghost" size="sm" aria-label="ลบ" onClick={() => remove(n)}>
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{n.content}</p>
                              {n.sourceUrl && (
                                <a href={n.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  แหล่งข้อมูล <ExternalLink size={11} />
                                </a>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
          <Button size="sm" variant="secondary" disabled={cur === 0} onClick={() => setPage(cur - 1)}>ก่อนหน้า</Button>
          <span className="tabular-nums">{cur + 1} / {pageCount}</span>
          <Button size="sm" variant="secondary" disabled={cur >= pageCount - 1} onClick={() => setPage(cur + 1)}>ถัดไป</Button>
        </div>
      )}
    </div>
  );
}
