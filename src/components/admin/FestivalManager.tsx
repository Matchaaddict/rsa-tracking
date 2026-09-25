"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { FESTIVAL_TYPE_LABELS, festIcon, festTheme, cn } from "@/lib/utils";
import { KIND_META, SECRETARY_SOURCE_TYPES, SOURCE_KINDS, sourceKind, type SourceKind } from "@/lib/tracking";
import { Plus, Pencil, Trash2, Loader2, X, Check, Lock, Globe, ExternalLink } from "lucide-react";
import type { SecretaryScope } from "../AdminPanel";

// "ที่มา" ของเรื่องที่ติดตาม: เทศกาล / การประชุม / โครงการเฉพาะ / มติ ครม.
interface Source {
  id: string;
  name: string;
  type: string;
  year: number;
  subCommitteeId: string | null;
  subCommittee: { id: string; name: string } | null;
  meetingNo: string | null;
  date: string | null;
  docUrl: string | null;
  description: string | null;
  isPublic: boolean;
  _count?: { proposals: number };
}

const ALL_TYPES = ["NEW_YEAR", "SONGKRAN", "MEETING", "PROJECT", "CABINET"];
const thisYear = new Date().getFullYear() + 543;

type Form = {
  name: string;
  type: string;
  year: number;
  subCommitteeId: string;
  meetingNo: string;
  date: string;
  docUrl: string;
  description: string;
  isPublic: boolean;
};

function emptyForm(type: string): Form {
  return {
    name: "",
    type,
    year: thisYear,
    subCommitteeId: "",
    meetingNo: "",
    date: "",
    docUrl: "",
    description: "",
    // เรื่องจากการประชุมมักเป็นเรื่องภายใน — ตั้งต้นเป็นไม่เผยแพร่
    isPublic: type !== "MEETING",
  };
}

const scShort = (name: string) => name.match(/^C(\d+)/)?.[1] ? `อนุฯ ${name.match(/^C(\d+)/)![1]}` : name;

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export function FestivalManager({ secretaryOf = null }: { secretaryOf?: SecretaryScope }) {
  const allowedTypes = secretaryOf ? SECRETARY_SOURCE_TYPES : ALL_TYPES;
  const [sources, setSources] = useState<Source[]>([]);
  const [subCommittees, setSubCommittees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(emptyForm(allowedTypes[0]));
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState<SourceKind | "ALL">("ALL");

  async function load() {
    const res = await fetch("/api/admin/festivals");
    setSources(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/admin/options")
      .then((r) => r.json())
      .then((d) => setSubCommittees(d.subCommittees ?? []));
  }, []);

  const kind = sourceKind(form.type);
  const needsOwner = kind === "MEETING" || kind === "PROJECT";

  // ชื่อที่แนะนำสำหรับการประชุม เช่น "ประชุมอนุฯ 3 ครั้งที่ 2/2569" (ชื่อต้องไม่ซ้ำ)
  function suggestedName(f: Form) {
    if (sourceKind(f.type) !== "MEETING" || !f.meetingNo.trim()) return "";
    const scId = secretaryOf?.id ?? f.subCommitteeId;
    const sc = subCommittees.find((s) => s.id === scId);
    return `ประชุม${sc ? scShort(sc.name) : ""} ครั้งที่ ${f.meetingNo.trim()}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = form.name.trim() || suggestedName(form);
    if (!name) {
      setError("กรุณาตั้งชื่อ");
      return;
    }
    setSubmitting(true);
    const res = await fetch(editId ? `/api/admin/festivals/${editId}` : "/api/admin/festivals", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, name, subCommitteeId: needsOwner ? form.subCommitteeId : "" }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setForm(emptyForm(allowedTypes[0]));
    setEditId(null);
    setShowForm(false);
    load();
  }

  async function handleDelete(s: Source) {
    const n = s._count?.proposals ?? 0;
    if (!confirm(`ลบ "${s.name}"?${n ? ` เรื่องที่ติดตาม ${n} เรื่องภายใต้ที่มานี้จะถูกลบด้วย` : ""}`)) return;
    await fetch(`/api/admin/festivals/${s.id}`, { method: "DELETE" });
    load();
  }

  function startEdit(s: Source) {
    setForm({
      name: s.name,
      type: s.type,
      year: s.year,
      subCommitteeId: s.subCommitteeId ?? "",
      meetingNo: s.meetingNo ?? "",
      date: s.date ? s.date.slice(0, 10) : "",
      docUrl: s.docUrl ?? "",
      description: s.description ?? "",
      isPublic: s.isPublic,
    });
    setEditId(s.id);
    setError("");
    setShowForm(true);
  }

  const kindsPresent = SOURCE_KINDS.filter((k) => sources.some((s) => sourceKind(s.type) === k));
  const shown = kindFilter === "ALL" ? sources : sources.filter((s) => sourceKind(s.type) === kindFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">จัดการที่มา</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {secretaryOf
              ? "บันทึกการประชุมหรือโครงการเฉพาะของอนุฯ แล้วเพิ่มเรื่องที่ติดตามในแท็บ \"เรื่องที่ติดตาม\""
              : "ที่มาของเรื่องที่ติดตาม: เทศกาล การประชุมอนุฯ โครงการเฉพาะ หรือมติ ครม. — % ความคืบหน้าคำนวณแยกตามประเภท"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowForm(true); setEditId(null); setError(""); setForm(emptyForm(allowedTypes[0])); }}
        >
          <Plus size={16} /> เพิ่มที่มา
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">ประเภท</label>
                <div className="flex flex-wrap gap-2">
                  {allowedTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...emptyForm(t), name: form.name, year: form.year })}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                        form.type === t ? `${festTheme(t).bgSolid} text-white` : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {festIcon(t)} {FESTIVAL_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {kind === "MEETING" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">ครั้งที่</label>
                    <input
                      type="text"
                      value={form.meetingNo}
                      onChange={(e) => setForm({ ...form, meetingNo: e.target.value })}
                      placeholder="เช่น 2/2569"
                      className={inputCls}
                      required
                    />
                  </div>
                )}
                {kind === "MEETING" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">วันที่ประชุม</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                )}
                <div className={kind === "MEETING" ? "" : "sm:col-span-2"}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    ชื่อ{kind === "MEETING" && <span className="text-gray-400 font-normal"> (เว้นว่างได้)</span>}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={
                      kind === "MEETING"
                        ? suggestedName(form) || "ประชุมอนุฯ … ครั้งที่ …"
                        : kind === "PROJECT"
                        ? "เช่น โครงการทางข้ามปลอดภัย"
                        : kind === "CABINET"
                        ? "เช่น มติ ครม. ก.พ. 2569"
                        : "เช่น ปีใหม่ 2569"
                    }
                    className={inputCls}
                    required={kind !== "MEETING"}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ปี (พ.ศ.)</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                    className={inputCls}
                    required
                  />
                </div>
                {needsOwner && (
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">อนุกรรมการเจ้าของ</label>
                    {secretaryOf ? (
                      <p className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">{secretaryOf.name}</p>
                    ) : (
                      <select
                        value={form.subCommitteeId}
                        onChange={(e) => setForm({ ...form, subCommitteeId: e.target.value })}
                        className={inputCls}
                        required={kind === "MEETING"}
                      >
                        <option value="">— ไม่ระบุ (ส่วนกลาง) —</option>
                        {subCommittees.map((sc) => (
                          <option key={sc.id} value={sc.id}>{sc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {needsOwner && (
                  <div className="sm:col-span-3">
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {kind === "MEETING" ? "ลิงก์รายงานการประชุม" : "ลิงก์เอกสารโครงการ"}
                      <span className="text-gray-400 font-normal"> (ถ้ามี)</span>
                    </label>
                    <input
                      type="url"
                      value={form.docUrl}
                      onChange={(e) => setForm({ ...form, docUrl: e.target.value })}
                      placeholder="https://"
                      className={inputCls}
                    />
                  </div>
                )}
                {kind === "PROJECT" && (
                  <div className="sm:col-span-3">
                    <label className="text-sm font-medium text-gray-700 block mb-1">รายละเอียดโครงการ</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-blue-600"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-800">แสดงบนหน้าสาธารณะ</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    ถ้าไม่ติ๊ก = เรื่องภายใน เห็นเฉพาะแอดมิน เลขาฯ อนุฯ และหน่วยงานที่รับผิดชอบ
                  </span>
                </span>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editId ? "บันทึก" : "เพิ่ม"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); setEditId(null); }}>
                  <X size={14} /> ยกเลิก
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {kindsPresent.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", ...kindsPresent] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border",
                kindFilter === k ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              )}
            >
              {k === "ALL" ? "ทั้งหมด" : `${KIND_META[k].icon} ${KIND_META[k].label}`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            {secretaryOf ? "ยังไม่มีการประชุมหรือโครงการของอนุฯ — กด \"เพิ่มที่มา\" เพื่อเริ่ม" : "ยังไม่มีที่มา"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-gray-900 break-words">{festIcon(s.type)} {s.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${festTheme(s.type).badge}`}>
                      {FESTIVAL_TYPE_LABELS[s.type] ?? s.type}
                    </span>
                    {s.isPublic ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <Globe size={10} /> สาธารณะ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        <Lock size={10} /> ภายใน
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ปี {s.year}
                    {s.subCommittee && <> · {s.subCommittee.name}</>}
                    {s.date && <> · ประชุม {new Date(s.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</>}
                    {s._count && <> · {s._count.proposals} เรื่อง</>}
                    {s.docUrl && (
                      <>
                        {" · "}
                        <a href={s.docUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                          เอกสาร <ExternalLink size={10} />
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(s)} aria-label="แก้ไข">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(s)} aria-label="ลบ">
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
