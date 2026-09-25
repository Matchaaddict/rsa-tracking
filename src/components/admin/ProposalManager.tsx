"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { STATUS_LABELS, STATUS_COLORS, festIcon, festTheme, cn } from "@/lib/utils";
import { KIND_META, SOURCE_KINDS, sourceKind, sourceLabel, type SourceKind } from "@/lib/tracking";
import {
  Plus, Pencil, Trash2, Loader2, X, Check, ChevronDown, ChevronUp, CalendarClock, Lock, Search, Users,
} from "lucide-react";
import type { SecretaryScope } from "../AdminPanel";

interface Source {
  id: string;
  name: string;
  type: string;
  year: number;
  isPublic: boolean;
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
  const [implForms, setImplForms] = useState<Record<string, { content: string; status: string }>>({});
  const [savingImpl, setSavingImpl] = useState<string | null>(null);
  // เลขาฯ ดูสถานะได้ แต่แก้ผลการดำเนินงานแทนหน่วยงานไม่ได้
  const canEditImpl = !secretaryOf;

  async function load() {
    const [ps, fs, opts] = await Promise.all([
      fetch("/api/admin/proposals").then((r) => r.json()),
      fetch("/api/admin/festivals").then((r) => r.json()),
      fetch("/api/admin/options").then((r) => r.json()),
    ]);
    setProposals(ps);
    setSources(fs);
    setSubCommittees(opts.subCommittees ?? []);
    setAgencies(opts.agencies ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function nextOrder(festivalId: string) {
    const nums = proposals.filter((p) => p.festivalId === festivalId).map((p) => p.orderNumber);
    return nums.length ? Math.max(...nums) + 1 : 1;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setForm({ ...emptyForm(fid, fid ? nextOrder(fid) : 1), subCommitteeIds: secretaryOf ? [secretaryOf.id] : [] });
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

  async function saveImpl(proposalId: string, agencyId: string) {
    const key = `${proposalId}:${agencyId}`;
    setSavingImpl(key);
    const form_ = implForms[key] || { content: "", status: "NOT_STARTED" };
    await fetch("/api/admin/implementations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, agencyId, ...form_ }),
    });
    setSavingImpl(null);
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
                    setForm({ ...form, festivalId: fid, orderNumber: editId ? form.orderNumber : nextOrder(fid) });
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
                      <Button variant="ghost" size="sm" onClick={() => startEdit(proposal)} aria-label="แก้ไข">
                        <Pencil size={14} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(proposal.id)} aria-label="ลบ">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-6 py-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      หน่วยงานที่ต้องรายงาน ({related.length} หน่วย)
                      {canEditImpl && " — แก้ไขผลการดำเนินงาน"}
                    </p>
                    {related.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">ยังไม่มีหน่วยงานที่ต้องรายงาน</p>
                    ) : !canEditImpl ? (
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {related.map((agency) => {
                          const impl = proposal.implementations.find((i) => i.agencyId === agency.id);
                          const st = impl?.status ?? "NOT_STARTED";
                          return (
                            <div key={agency.id} className="flex items-start justify-between gap-3 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm text-gray-800">{agency.name}</p>
                                {impl?.content && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap break-words">{impl.content}</p>}
                              </div>
                              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[st]}`}>
                                {impl ? STATUS_LABELS[st] : "ยังไม่รายงาน"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {related.map((agency) => {
                          const key = `${proposal.id}:${agency.id}`;
                          const existingImpl = proposal.implementations.find((i) => i.agencyId === agency.id);
                          const form_ = implForms[key] ?? {
                            content: existingImpl?.content || "",
                            status: existingImpl?.status || "NOT_STARTED",
                          };

                          return (
                            <div key={agency.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-800">{agency.name}</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[form_.status]}`}>
                                  {STATUS_LABELS[form_.status]}
                                </span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NOT_RELEVANT"] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => setImplForms((f) => ({ ...f, [key]: { ...form_, status: s } }))}
                                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                      form_.status === s
                                        ? s === "COMPLETED"
                                          ? "bg-green-500 text-white border-green-500"
                                          : s === "IN_PROGRESS"
                                          ? "bg-yellow-500 text-white border-yellow-500"
                                          : s === "NOT_RELEVANT"
                                          ? "bg-slate-400 text-white border-slate-400"
                                          : "bg-gray-400 text-white border-gray-400"
                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                                  >
                                    {STATUS_LABELS[s]}
                                  </button>
                                ))}
                              </div>
                              <textarea
                                rows={2}
                                value={form_.content}
                                onChange={(e) => setImplForms((f) => ({ ...f, [key]: { ...form_, content: e.target.value } }))}
                                placeholder="ผลการดำเนินงาน..."
                                className={cn(inputCls, "resize-none")}
                              />
                              <Button size="sm" onClick={() => saveImpl(proposal.id, agency.id)} disabled={savingImpl === key}>
                                {savingImpl === key ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                บันทึก
                              </Button>
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
