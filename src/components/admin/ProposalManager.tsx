"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { FESTIVAL_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Loader2, X, Check, ChevronDown, ChevronUp,
} from "lucide-react";

interface Festival {
  id: string;
  name: string;
  type: string;
  year: number;
}

interface SubCommittee {
  id: string;
  name: string;
}

interface Agency {
  id: string;
  name: string;
  subCommittees: { subCommittee: SubCommittee }[];
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
  festival: Festival;
  festivalId: string;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: Implementation[];
  _count?: { implementations: number };
}

const emptyForm = {
  title: "",
  description: "",
  festivalId: "",
  orderNumber: 1,
  subCommitteeIds: [] as string[],
};

export function ProposalManager() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterFestival, setFilterFestival] = useState("all");
  const [implForms, setImplForms] = useState<Record<string, { content: string; status: string }>>({});
  const [savingImpl, setSavingImpl] = useState<string | null>(null);

  async function load() {
    const [pRes, fRes, scRes, aRes] = await Promise.all([
      fetch("/api/admin/proposals"),
      fetch("/api/admin/festivals"),
      fetch("/api/admin/subcommittees"),
      fetch("/api/admin/agencies"),
    ]);
    const [ps, fs, scs, as_] = await Promise.all([pRes.json(), fRes.json(), scRes.json(), aRes.json()]);
    setProposals(ps);
    setFestivals(fs);
    setSubCommittees(scs);
    setAgencies(as_);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editId ? `/api/admin/proposals/${editId}` : "/api/admin/proposals";
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
    if (!confirm("ลบข้อเสนอนี้?")) return;
    await fetch(`/api/admin/proposals/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(p: Proposal) {
    setForm({
      title: p.title,
      description: p.description || "",
      festivalId: p.festivalId,
      orderNumber: p.orderNumber,
      subCommitteeIds: p.subCommittees.map((s) => s.subCommittee.id),
    });
    setEditId(p.id);
    setShowForm(true);
  }

  function toggleSc(id: string) {
    setForm((f) => ({
      ...f,
      subCommitteeIds: f.subCommitteeIds.includes(id)
        ? f.subCommitteeIds.filter((x) => x !== id)
        : [...f.subCommitteeIds, id],
    }));
  }

  function getAgenciesForProposal(proposal: Proposal) {
    const scIds = proposal.subCommittees.map((s) => s.subCommittee.id);
    return agencies.filter((a) =>
      a.subCommittees.some((s) => scIds.includes(s.subCommittee.id))
    );
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

  const filtered =
    filterFestival === "all"
      ? proposals
      : proposals.filter((p) => p.festivalId === filterFestival);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">จัดการข้อเสนอ</h2>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> เพิ่มข้อเสนอ
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">ข้อเสนอ</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="รายละเอียดข้อเสนอ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ลำดับข้อ</label>
                  <input
                    type="number"
                    value={form.orderNumber}
                    onChange={(e) => setForm({ ...form, orderNumber: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={1}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">วาระ</label>
                <select
                  value={form.festivalId}
                  onChange={(e) => setForm({ ...form, festivalId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">เลือกวาระ...</option>
                  {festivals.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({FESTIVAL_TYPE_LABELS[f.type]} {f.year})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  อนุกรรมการที่รับผิดชอบ
                </label>
                <div className="flex flex-wrap gap-2">
                  {subCommittees.map((sc) => {
                    const n = sc.name.match(/^C(\d+)/)?.[1];
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => toggleSc(sc.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          form.subCommitteeIds.includes(sc.id)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {n ? `อนุฯ ${n}` : sc.name}
                      </button>
                    );
                  })}
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

      {/* Filter by วาระ */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterFestival("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            filterFestival === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          ทุกวาระ
        </button>
        {festivals.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterFestival(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterFestival === f.id
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-600" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-400">ยังไม่มีข้อเสนอ</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((proposal) => {
            const relatedAgencies = getAgenciesForProposal(proposal);
            const isExpanded = expandedId === proposal.id;

            return (
              <Card key={proposal.id}>
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-gray-400">ข้อ {proposal.orderNumber}</span>
                        <Badge variant={proposal.festival.type === "NEW_YEAR" ? "default" : "warning"}>
                          {FESTIVAL_TYPE_LABELS[proposal.festival.type]} {proposal.festival.year}
                        </Badge>
                        {proposal.subCommittees.map((sc) => {
                          const n = sc.subCommittee.name.match(/^C(\d+)/)?.[1];
                          return <Badge key={sc.subCommittee.id} variant="gray">{n ? `อนุฯ ${n}` : sc.subCommittee.name}</Badge>;
                        })}
                      </div>
                      <p className="font-medium text-gray-900">{proposal.title}</p>
                      {proposal.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{proposal.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(proposal)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(proposal.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      หน่วยงานที่เกี่ยวข้อง ({relatedAgencies.length} หน่วย) — แก้ไขผลการดำเนินงาน
                    </p>
                    {relatedAgencies.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">
                        ยังไม่มีหน่วยงานอยู่ภายใต้อนุกรรมการที่เลือก
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {relatedAgencies.map((agency) => {
                          const key = `${proposal.id}:${agency.id}`;
                          const existingImpl = proposal.implementations.find(
                            (i) => i.agencyId === agency.id
                          );
                          const form_ = implForms[key] ?? {
                            content: existingImpl?.content || "",
                            status: existingImpl?.status || "NOT_STARTED",
                          };

                          return (
                            <div
                              key={agency.id}
                              className="border border-gray-200 rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-800">{agency.name}</p>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[form_.status]}`}
                                >
                                  {STATUS_LABELS[form_.status]}
                                </span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NOT_RELEVANT"] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() =>
                                      setImplForms((f) => ({ ...f, [key]: { ...form_, status: s } }))
                                    }
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
                                onChange={(e) =>
                                  setImplForms((f) => ({
                                    ...f,
                                    [key]: { ...form_, content: e.target.value },
                                  }))
                                }
                                placeholder="ผลการดำเนินงาน..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveImpl(proposal.id, agency.id)}
                                disabled={savingImpl === key}
                              >
                                {savingImpl === key ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
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
