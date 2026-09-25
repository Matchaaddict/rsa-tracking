"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { STATUS_LABELS, STATUS_COLORS, festIcon, festTheme, cn } from "@/lib/utils";
import { KIND_META, SOURCE_KINDS, sourceKind, sourceLabel, type SourceKind } from "@/lib/tracking";
import {
  Plus, Pencil, Trash2, Loader2, X, Check, ChevronDown, ChevronUp, CalendarClock, Lock, Search, Users, Hash,
} from "lucide-react";
import type { SecretaryScope } from "../AdminPanel";

interface Source {
  id: string;
  name: string;
  type: string;
  year: number;
  isPublic: boolean;
  subCommitteeId: string | null;
}

interface SubCommittee {
  id: string;
  name: string;
}

interface AgencyOption {
  id: string;
  name: string;
  subCommitteeIds: string[];
}

interface Implementation {
  agencyId: string;
  status: string;
  content: string | null;
  evidenceUrl: string | null;
  progressEntries: { reportedBy: string | null; contactTitle: string; createdAt: string }[];
}

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  orderNumber: number;
  dueDate: string | null;
  festival: Source;
  festivalId: string;
  subCommittees: { subCommittee: SubCommittee }[];
  assignees: { agency: { id: string; name: string } }[];
  tags: { tag: { id: string; name: string } }[];
  implementations: Implementation[];
}

type Form = {
  title: string;
  description: string;
  festivalId: string;
  orderNumber: number;
  dueDate: string;
  subCommitteeIds: string[];
  assignMode: "subcommittee" | "specific";
  assigneeIds: string[];
  tagNames: string[];
};

const emptyForm = (festivalId = "", orderNumber = 1): Form => ({
  title: "",
  description: "",
  festivalId,
  orderNumber,
  dueDate: "",
  subCommitteeIds: [],
  assignMode: "subcommittee",
  assigneeIds: [],
  tagNames: [],
});

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const scShort = (name: string) => {
  const n = name.match(/^C(\d+)/)?.[1];
  return n ? `อนุฯ ${n}` : name;
};

const thDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

export function ProposalManager({ secretaryOf = null }: { secretaryOf?: SecretaryScope }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<SourceKind | "ALL">("ALL");
  const [filterSource, setFilterSource] = useState("all");
  const [agencyQuery, setAgencyQuery] = useState("");
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  // ฟอร์ม "หยอดความคืบหน้า" ให้หน่วยงาน (เปิดได้ทีละหน่วยงาน)
  const [hintKey, setHintKey] = useState<string | null>(null);
  const [hint, setHint] = useState({ content: "", evidenceUrl: "" });
  const [hintSaving, setHintSaving] = useState(false);
  const [hintError, setHintError] = useState("");
  // เลขาฯ แก้/ลบได้เฉพาะเรื่องใต้ที่มาของอนุฯ ตัวเอง (เรื่องเทศกาลที่ผูกกับอนุฯ หยอดความคืบหน้าได้อย่างเดียว)
  const canManage = (p: Proposal) => !secretaryOf || p.festival.subCommitteeId === secretaryOf.id;

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/admin/proposals").then((r) => r.json()),
      fetch("/api/admin/festivals").then((r) => r.json()),
      fetch("/api/admin/options").then((r) => r.json()),
    ]).then(([ps, fs, opts]) => {
      if (!alive) return;
      setProposals(ps);
      setSources(fs);
      setSubCommittees(opts.subCommittees ?? []);
      setAgencies(opts.agencies ?? []);
      setAllTags(opts.tags ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [version]);

  // เลือกที่มาที่มีอนุฯ เจ้าของ (เช่น การประชุมของอนุฯ 1) → เลือกอนุฯ นั้นให้เลย
  // ถ้าอนุฯ ที่เลือกอยู่ถูกเติมอัตโนมัติจากที่มาเดิม ให้เปลี่ยนตามที่มาใหม่ (ไม่ทับที่ผู้ใช้เลือกเอง)
  function scForSource(festivalId: string, current: string[], prevFestivalId = "") {
    if (secretaryOf) return [secretaryOf.id];
    const ownerOf = (id: string) => sources.find((s) => s.id === id)?.subCommitteeId ?? null;
    const owner = ownerOf(festivalId);
    const prevOwner = ownerOf(prevFestivalId);
    const autoFilled = current.length === 0 || (current.length === 1 && current[0] === prevOwner);
    if (!autoFilled) return current;
    return owner ? [owner] : [];
  }

  function nextOrder(festivalId: string) {
    const nums = proposals.filter((p) => p.festivalId === festivalId).map((p) => p.orderNumber);
    return nums.length ? Math.max(...nums) + 1 : 1;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pendingTag = tagDraft.replace(/^#+/, "").trim();
    const tagNames = pendingTag && !form.tagNames.includes(pendingTag) ? [...form.tagNames, pendingTag] : form.tagNames;
    if (form.assignMode === "subcommittee" && form.subCommitteeIds.length === 0 && !secretaryOf) {
      alert("กรุณาเลือกอนุกรรมการที่รับผิดชอบ — ถ้าไม่เลือก จะไม่มีหน่วยงานใดต้องรายงานเรื่องนี้");
      return;
    }
    if (form.assignMode === "specific" && form.assigneeIds.length === 0) {
      alert("กรุณาเลือกหน่วยงานอย่างน้อย 1 หน่วย หรือเปลี่ยนเป็น \"ทุกหน่วยงานในอนุฯ\"");
      return;
    }
    setSubmitting(true);
    const res = await fetch(editId ? `/api/admin/proposals/${editId}` : "/api/admin/proposals", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tagNames,
        assigneeIds: form.assignMode === "specific" ? form.assigneeIds : [],
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`บันทึกไม่สำเร็จ: ${err.error ?? res.status}`);
      return;
    }
    setForm(emptyForm());
    setTagDraft("");
    setEditId(null);
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบเรื่องนี้? ผลรายงานของหน่วยงานในเรื่องนี้จะถูกลบด้วย")) return;
    const res = await fetch(`/api/admin/proposals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`ลบไม่สำเร็จ: ${err.error ?? res.status}`);
      return;
    }
    load();
  }

  function startCreate() {
    const fid = filterSource !== "all" ? filterSource : sources[0]?.id ?? "";
    setForm({ ...emptyForm(fid, fid ? nextOrder(fid) : 1), subCommitteeIds: scForSource(fid, []) });
    setEditId(null);
    setAgencyQuery("");
    setShowForm(true);
  }

  function startEdit(p: Proposal) {
    setForm({
      title: p.title,
      description: p.description || "",
      festivalId: p.festivalId,
      orderNumber: p.orderNumber,
      dueDate: p.dueDate ? p.dueDate.slice(0, 10) : "",
      subCommitteeIds: p.subCommittees.map((s) => s.subCommittee.id),
      assignMode: p.assignees.length ? "specific" : "subcommittee",
      assigneeIds: p.assignees.map((a) => a.agency.id),
      tagNames: p.tags.map((t) => t.tag.name),
    });
    setEditId(p.id);
    setAgencyQuery("");
    setShowForm(true);
  }

  function toggleIn(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  // หน่วยงานที่ต้องรายงาน: รายชื่อที่มอบหมาย หรือทุกหน่วยงานในอนุฯ ของเรื่อง
  function responsibleAgencies(p: Proposal) {
    if (p.assignees.length) {
      const ids = new Set(p.assignees.map((a) => a.agency.id));
      return agencies.filter((a) => ids.has(a.id));
    }
    const scIds = p.subCommittees.map((s) => s.subCommittee.id);
    return agencies.filter((a) => a.subCommitteeIds.some((id) => scIds.includes(id)));
  }

  async function submitHint(proposalId: string, agencyId: string) {
    setHintSaving(true);
    setHintError("");
    const res = await fetch("/api/admin/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, agencyId, ...hint }),
    });
    setHintSaving(false);
    if (!res.ok) {
      setHintError((await res.json().catch(() => null))?.error ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setHintKey(null);
    setHint({ content: "", evidenceUrl: "" });
    load();
  }

  const kindsPresent = SOURCE_KINDS.filter((k) => sources.some((s) => sourceKind(s.type) === k));
  const sourcesInKind = kindFilter === "ALL" ? sources : sources.filter((s) => sourceKind(s.type) === kindFilter);
  const filtered = proposals.filter((p) =>
    filterSource !== "all"
      ? p.festivalId === filterSource
      : kindFilter === "ALL" || sourceKind(p.festival.type) === kindFilter
  );

  // ในฟอร์ม: หน่วยงานในอนุฯ ที่เลือกขึ้นก่อน เพื่อหาเจอง่าย
  const formScIds = secretaryOf ? [secretaryOf.id] : form.subCommitteeIds;
  const aq = agencyQuery.trim().toLowerCase();
  const agencyChoices = agencies
    .filter((a) => !aq || a.name.toLowerCase().includes(aq))
    .sort((a, b) => {
      const ia = a.subCommitteeIds.some((id) => formScIds.includes(id)) ? 0 : 1;
      const ib = b.subCommitteeIds.some((id) => formScIds.includes(id)) ? 0 : 1;
      return ia - ib || a.name.localeCompare(b.name, "th");
    });
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">เรื่องที่ติดตาม</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            ข้อเสนอจากเทศกาล มติจากที่ประชุม หรือภารกิจของโครงการเฉพาะ — หน่วยงานรายงานความคืบหน้ารายเรื่อง
          </p>
        </div>
        <Button size="sm" onClick={startCreate} disabled={sources.length === 0}>
          <Plus size={16} /> เพิ่มเรื่อง
        </Button>
      </div>

      {!loading && sources.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-gray-500">
            ยังไม่มีที่มา — เพิ่มการประชุมหรือโครงการในแท็บ &ldquo;ที่มา&rdquo; ก่อน แล้วจึงเพิ่มเรื่องที่ติดตาม
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">ที่มา</label>
                <select
                  value={form.festivalId}
                  onChange={(e) => {
                    const fid = e.target.value;
                    setForm({
                      ...form,
                      festivalId: fid,
                      orderNumber: editId ? form.orderNumber : nextOrder(fid),
                      subCommitteeIds: scForSource(fid, form.subCommitteeIds, form.festivalId),
                    });
                  }}
                  className={inputCls}
                  required
                >
                  <option value="">เลือกที่มา...</option>
                  {SOURCE_KINDS.filter((k) => kindsPresent.includes(k)).map((k) => (
                    <optgroup key={k} label={`${KIND_META[k].icon} ${KIND_META[k].label}`}>
                      {sources
                        .filter((s) => sourceKind(s.type) === k)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {sourceLabel(s)}{s.isPublic ? "" : " (ภายใน)"}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-sm font-medium text-gray-700 block mb-1">เรื่อง / ข้อเสนอ / มติ</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="เช่น สำรวจจุดทางข้ามหน้าโรงเรียนที่ยังไม่มีสัญญาณไฟ"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ลำดับข้อ</label>
                  <input
                    type="number"
                    value={form.orderNumber}
                    onChange={(e) => setForm({ ...form, orderNumber: parseInt(e.target.value) })}
                    className={inputCls}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-sm font-medium text-gray-700 block mb-1">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">กำหนดแล้วเสร็จ</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">อนุกรรมการที่รับผิดชอบ</label>
                {secretaryOf ? (
                  <p className="text-sm text-gray-700">{secretaryOf.name}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subCommittees.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        title={sc.name}
                        onClick={() => setForm((f) => ({ ...f, subCommitteeIds: toggleIn(f.subCommitteeIds, sc.id) }))}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                          form.subCommitteeIds.includes(sc.id)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {scShort(sc.name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  ประเด็น <span className="font-normal text-gray-400">(เช่น ทางข้าม, ดื่มแล้วขับ — กด Enter เพื่อเพิ่ม)</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                  {form.tagNames.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tagNames: f.tagNames.filter((x) => x !== t) }))}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                    >
                      #{t} <X size={11} />
                    </button>
                  ))}
                  <input
                    list="tag-suggestions"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const name = tagDraft.replace(/^#+/, "").replace(/,/g, "").trim();
                        if (name && !form.tagNames.includes(name)) setForm((f) => ({ ...f, tagNames: [...f.tagNames, name] }));
                        setTagDraft("");
                      } else if (e.key === "Backspace" && !tagDraft && form.tagNames.length) {
                        setForm((f) => ({ ...f, tagNames: f.tagNames.slice(0, -1) }));
                      }
                    }}
                    placeholder={form.tagNames.length ? "" : "พิมพ์ชื่อประเด็น..."}
                    className="min-w-[8rem] flex-1 border-0 bg-transparent py-0.5 text-sm focus:outline-none"
                  />
                  <datalist id="tag-suggestions">
                    {allTags.filter((t) => !form.tagNames.includes(t.name)).map((t) => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                <p className="text-sm font-medium text-gray-700">หน่วยงานที่ต้องรายงาน</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {([
                    ["subcommittee", "ทุกหน่วยงานในอนุฯ", "เหมาะกับข้อเสนอเชิงนโยบายจากเทศกาล"],
                    ["specific", "ระบุหน่วยงาน", "เหมาะกับมติที่ประชุมที่มอบหมายเฉพาะบางหน่วย"],
                  ] as const).map(([mode, label, hint]) => (
                    <label
                      key={mode}
                      className={cn(
                        "flex-1 flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer",
                        form.assignMode === mode ? "border-blue-500 bg-blue-50/60" : "border-gray-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="assignMode"
                        checked={form.assignMode === mode}
                        onChange={() => setForm({ ...form, assignMode: mode })}
                        className="mt-0.5 accent-blue-600"
                      />
                      <span className="text-sm">
                        <span className="font-medium text-gray-800">{label}</span>
                        <span className="block text-xs text-gray-500">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {form.assignMode === "specific" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={agencyQuery}
                        onChange={(e) => setAgencyQuery(e.target.value)}
                        placeholder="ค้นหาหน่วยงาน..."
                        className={cn(inputCls, "pl-8")}
                      />
                    </div>
                    {form.assigneeIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.assigneeIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, assigneeIds: toggleIn(f.assigneeIds, id) }))}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs text-white"
                          >
                            {agencies.find((a) => a.id === id)?.name ?? id} <X size={11} />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                      {agencyChoices.map((a) => {
                        const inSc = a.subCommitteeIds.some((id) => formScIds.includes(id));
                        return (
                          <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={form.assigneeIds.includes(a.id)}
                              onChange={() => setForm((f) => ({ ...f, assigneeIds: toggleIn(f.assigneeIds, a.id) }))}
                              className="accent-blue-600"
                            />
                            <span className="flex-1 text-gray-700">{a.name}</span>
                            {inSc && <span className="text-[10px] text-blue-600">ในอนุฯ</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

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

      {/* ตัวกรอง: ประเภท → ที่มา */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {kindsPresent.length > 1 &&
            (["ALL", ...kindsPresent] as const).map((k) => (
              <button
                key={k}
                onClick={() => { setKindFilter(k); setFilterSource("all"); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  kindFilter === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                )}
              >
                {k === "ALL" ? "ทุกประเภท" : `${KIND_META[k].icon} ${KIND_META[k].label}`}
              </button>
            ))}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-full text-sm bg-white max-w-full"
          >
            <option value="all">ทุกที่มา{kindFilter !== "ALL" ? `ใน${KIND_META[kindFilter].label}` : ""}</option>
            {sourcesInKind.map((s) => (
              <option key={s.id} value={s.id}>{sourceLabel(s)}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-600" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        sources.length > 0 && <Card><CardContent className="py-10 text-center text-gray-400">ยังไม่มีเรื่องที่ติดตาม</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((proposal) => {
            const related = responsibleAgencies(proposal);
            const isExpanded = expandedId === proposal.id;
            const overdue =
              proposal.dueDate &&
              new Date(proposal.dueDate) < now &&
              related.some((a) => proposal.implementations.find((i) => i.agencyId === a.id)?.status !== "COMPLETED");

            return (
              <Card key={proposal.id}>
                <div className="px-4 sm:px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-xs text-gray-400">ข้อ {proposal.orderNumber}</span>
                        <Badge variant={festTheme(proposal.festival.type).badgeVariant}>
                          {festIcon(proposal.festival.type)} {sourceLabel(proposal.festival)}
                        </Badge>
                        {!proposal.festival.isPublic && (
                          <Badge variant="gray"><Lock size={10} className="mr-1" />ภายใน</Badge>
                        )}
                        {proposal.subCommittees.map((sc) => (
                          <Badge key={sc.subCommittee.id} variant="gray">{scShort(sc.subCommittee.name)}</Badge>
                        ))}
                        {proposal.assignees.length > 0 && (
                          <Badge variant="default"><Users size={10} className="mr-1" />มอบหมาย {proposal.assignees.length} หน่วยงาน</Badge>
                        )}
                        {proposal.tags.map((t) => (
                          <Badge key={t.tag.id} variant="default"><Hash size={10} />{t.tag.name}</Badge>
                        ))}
                        {proposal.dueDate && (
                          <Badge variant={overdue ? "danger" : "gray"}>
                            <CalendarClock size={10} className="mr-1" />
                            {overdue ? "เลยกำหนด " : "กำหนด "}{thDate(proposal.dueDate)}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 break-words">{proposal.title}</p>
                      {proposal.description && (
                        <p className="text-sm text-gray-500 mt-0.5 break-words">{proposal.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 sm:gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : proposal.id)} aria-label="ดูหน่วยงาน">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                      {canManage(proposal) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => startEdit(proposal)} aria-label="แก้ไข">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(proposal.id)} aria-label="ลบ">
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-6 py-4">
                    <p className="text-sm font-medium text-gray-700">หน่วยงานที่ต้องรายงาน ({related.length} หน่วย)</p>
                    <p className="text-xs text-gray-500 mb-3">
                      เห็นความคืบหน้าจากช่องทางอื่น (เช่น เพจ Facebook ของหน่วยงาน) กด &ldquo;หยอดความคืบหน้า&rdquo; เพื่อบันทึกไว้ให้ก่อน —
                      สถานะจะเป็น &ldquo;กำลังดำเนินการ&rdquo; และหน่วยงานเป็นผู้ยืนยันว่าเสร็จเอง
                    </p>
                    {related.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">ยังไม่มีหน่วยงานที่ต้องรายงาน</p>
                    ) : (
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {related.map((agency) => {
                          const key = `${proposal.id}:${agency.id}`;
                          const impl = proposal.implementations.find((i) => i.agencyId === agency.id);
                          const st = impl?.status ?? "NOT_STARTED";
                          const last = impl?.progressEntries[0];
                          const locked = st === "COMPLETED" || st === "NOT_RELEVANT";
                          const open = hintKey === key;
                          return (
                            <div key={agency.id} className="px-3 py-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-800">{agency.name}</p>
                                  {impl?.content && (
                                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap break-words">{impl.content}</p>
                                  )}
                                  {last?.reportedBy && (
                                    <p className="mt-1 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                      {`${last.contactTitle} บันทึกให้ · รอหน่วยงานยืนยัน`}
                                    </p>
                                  )}
                                  {impl?.evidenceUrl && (
                                    <a href={impl.evidenceUrl} target="_blank" rel="noreferrer" className="ml-2 text-[11px] text-blue-600 hover:underline">
                                      หลักฐาน ↗
                                    </a>
                                  )}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[st]}`}>
                                    {impl ? STATUS_LABELS[st] : "ยังไม่รายงาน"}
                                  </span>
                                  {!locked && !open && (
                                    <button
                                      onClick={() => { setHintKey(key); setHint({ content: "", evidenceUrl: "" }); setHintError(""); }}
                                      className="text-xs font-medium text-blue-600 hover:underline"
                                    >
                                      + หยอดความคืบหน้า
                                    </button>
                                  )}
                                </div>
                              </div>
                              {open && (
                                <div className="mt-2 space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                  <textarea
                                    rows={2}
                                    value={hint.content}
                                    onChange={(e) => setHint({ ...hint, content: e.target.value })}
                                    placeholder="เช่น เพจหน่วยงานโพสต์ว่าติดตั้งไฟส่องสว่างแล้ว 3 จุด (15 ก.ย. 69)"
                                    className={cn(inputCls, "resize-none bg-white")}
                                  />
                                  <input
                                    type="url"
                                    value={hint.evidenceUrl}
                                    onChange={(e) => setHint({ ...hint, evidenceUrl: e.target.value })}
                                    placeholder="ลิงก์หลักฐาน (ถ้ามี) — โพสต์ Facebook, ข่าว, Google Drive ฯลฯ"
                                    className={cn(inputCls, "bg-white")}
                                  />
                                  {hintError && <p className="text-xs text-red-600">{hintError}</p>}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button size="sm" onClick={() => submitHint(proposal.id, agency.id)} disabled={hintSaving || !hint.content.trim()}>
                                      {hintSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                      บันทึกเป็น &ldquo;กำลังดำเนินการ&rdquo;
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => setHintKey(null)}>
                                      <X size={12} /> ยกเลิก
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
