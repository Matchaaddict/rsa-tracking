"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { STATUS_LABELS, STATUS_COLORS, festIcon, festTheme } from "@/lib/utils";
import { sourceLabel } from "@/lib/tracking";
import { Loader2, FileText, MessageCircle, KeyRound, ShieldAlert, CheckCircle2, AlertCircle, Link2, User, Plus, Pencil, Trash2, X, Check, Clock } from "lucide-react";

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={{ overflow: "hidden" }}
    />
  );
}
import { AgencyMessages } from "./AgencyMessages";
import { AgencyPasswordChange } from "./AgencyPasswordChange";

interface Festival {
  id: string;
  name: string;
  type: string;
  year: number;
  isPublic?: boolean;
}

interface SubCommittee {
  id: string;
  name: string;
}

interface ProgressEntry {
  id: string;
  content: string;
  status: string;
  contactName: string;
  contactTitle: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
}

interface Implementation {
  id?: string;
  status: string;
  content: string | null;
  evidenceUrl: string | null;
  progressEntries: ProgressEntry[];
}

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  orderNumber: number;
  dueDate?: string | Date | null;
  festival: Festival;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: Implementation[];
}

interface MetadataState {
  status: string;
  evidenceUrl: string;
}

interface ContactInfo {
  contactName: string;
  contactTitle: string;
  contactPhone: string;
}

function buildInitialMeta(proposals: Proposal[]): Record<string, MetadataState> {
  const m: Record<string, MetadataState> = {};
  proposals.forEach((p) => {
    const impl = p.implementations[0];
    m[p.id] = {
      status: impl?.status || "NOT_STARTED",
      evidenceUrl: impl?.evidenceUrl || "",
    };
  });
  return m;
}

function buildInitialEntries(proposals: Proposal[]): Record<string, ProgressEntry[]> {
  const e: Record<string, ProgressEntry[]> = {};
  proposals.forEach((p) => {
    e[p.id] = p.implementations[0]?.progressEntries ?? [];
  });
  return e;
}

// Newest entry across all proposals — used to pre-fill contact info
// when starting a new report. Falls back to localStorage for empty agencies.
function findLatestContact(entries: Record<string, ProgressEntry[]>): ContactInfo | null {
  let latest: ProgressEntry | null = null;
  Object.values(entries).forEach((list) => {
    list.forEach((e) => {
      if (!latest || new Date(e.createdAt) > new Date(latest.createdAt)) latest = e;
    });
  });
  if (!latest) return null;
  const e = latest as ProgressEntry;
  if (!e.contactName && !e.contactTitle && !e.contactPhone) return null;
  return {
    contactName: e.contactName,
    contactTitle: e.contactTitle,
    contactPhone: e.contactPhone,
  };
}

function formatThaiDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AgencyDashboard({
  agencyName,
  initialProposals,
  isDefaultPassword: initialIsDefault,
  initialUnreadCount = 0,
}: {
  agencyName: string;
  initialProposals: Proposal[];
  isDefaultPassword: boolean;
  initialUnreadCount?: number;
}) {
  const [activeTab, setActiveTab] = useState<"proposals" | "messages" | "password">("proposals");
  const [isDefaultPassword, setIsDefaultPassword] = useState(initialIsDefault);
  const [unreadAdminCount, setUnreadAdminCount] = useState(initialUnreadCount);
  const [proposals] = useState<Proposal[]>(initialProposals);
  const [meta, setMeta] = useState<Record<string, MetadataState>>(() => buildInitialMeta(initialProposals));
  const [entries, setEntries] = useState<Record<string, ProgressEntry[]>>(() => buildInitialEntries(initialProposals));
  // Pre-fill contact for next "เพิ่มรายงาน" form. Updated whenever the user
  // submits an entry so subsequent forms remember who's working today.
  const initialEntries = buildInitialEntries(initialProposals);
  const [lastContact, setLastContact] = useState<ContactInfo>(
    () => findLatestContact(initialEntries) ?? { contactName: "", contactTitle: "", contactPhone: "" }
  );
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<Record<string, boolean>>({});
  const [savingCount, setSavingCount] = useState(0);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }
  const hasImpl = useRef<Set<string>>(
    new Set(initialProposals.filter((p) => p.implementations[0]).map((p) => p.id))
  );

  // Persist last-used contact in localStorage so reopening the page in a
  // fresh browser session for an empty agency still benefits from prefill.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rsat_last_contact");
      if (raw) {
        const parsed = JSON.parse(raw) as ContactInfo;
        if (!lastContact.contactName && parsed?.contactName) setLastContact(parsed);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rememberContact(c: ContactInfo) {
    setLastContact(c);
    try {
      localStorage.setItem("rsat_last_contact", JSON.stringify(c));
    } catch {
      // ignore
    }
  }

  // Warn before closing/navigating away if there are unsaved or pending changes
  useEffect(() => {
    const hasPending = Object.values(dirty).some(Boolean) || Object.values(saveError).some(Boolean);
    if (!hasPending) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saveError]);

  async function saveMetadata(proposalId: string, metaData: MetadataState) {
    if (!metaData.evidenceUrl?.trim() && !hasImpl.current.has(proposalId)) {
      setDirty((d) => ({ ...d, [proposalId]: false }));
      return;
    }
    setSavingCount((n) => n + 1);
    setSaveError((e) => ({ ...e, [proposalId]: false }));
    try {
      const res = await fetch("/api/agency/implementations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId,
          evidenceUrl: metaData.evidenceUrl,
        }),
      });
      if (!res.ok) throw new Error("server error");
      hasImpl.current.add(proposalId);
      setDirty((d) => ({ ...d, [proposalId]: false }));
    } catch {
      setSaveError((e) => ({ ...e, [proposalId]: true }));
    } finally {
      setSavingCount((n) => n - 1);
    }
  }

  function handleEvidenceChange(proposalId: string, evidenceUrl: string) {
    const newMeta = { ...meta[proposalId], evidenceUrl };
    setMeta((m) => ({ ...m, [proposalId]: newMeta }));
    setDirty((d) => ({ ...d, [proposalId]: true }));
    clearTimeout(timers.current[proposalId]);
    timers.current[proposalId] = setTimeout(() => saveMetadata(proposalId, newMeta), 1500);
  }

  async function addEntry(
    proposalId: string,
    content: string,
    status: string,
    contactInfo: ContactInfo
  ) {
    setSavingCount((n) => n + 1);
    setSaveError((e) => ({ ...e, [proposalId]: false }));
    try {
      const res = await fetch("/api/agency/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, content, status, ...contactInfo }),
      });
      if (!res.ok) throw new Error("server error");
      const entry = (await res.json()) as ProgressEntry;
      setEntries((e) => ({ ...e, [proposalId]: [entry, ...(e[proposalId] ?? [])] }));
      setMeta((m) => ({ ...m, [proposalId]: { ...m[proposalId], status } }));
      hasImpl.current.add(proposalId);
      rememberContact(contactInfo);
      showToast("เพิ่มรายงานเรียบร้อย");
      return true;
    } catch {
      setSaveError((e) => ({ ...e, [proposalId]: true }));
      return false;
    } finally {
      setSavingCount((n) => n - 1);
    }
  }

  async function updateEntry(
    proposalId: string,
    entryId: string,
    content: string,
    status: string,
    contactInfo: ContactInfo
  ) {
    setSavingCount((n) => n + 1);
    try {
      const res = await fetch(`/api/agency/progress/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, status, ...contactInfo }),
      });
      if (!res.ok) throw new Error("server error");
      const updated = (await res.json()) as ProgressEntry;
      setEntries((e) => ({
        ...e,
        [proposalId]: (e[proposalId] ?? []).map((x) => (x.id === entryId ? updated : x)),
      }));
      const isLatest = (entries[proposalId] ?? [])[0]?.id === entryId;
      if (isLatest) {
        setMeta((m) => ({ ...m, [proposalId]: { ...m[proposalId], status } }));
      }
      rememberContact(contactInfo);
      showToast("บันทึกการแก้ไขเรียบร้อย");
      return true;
    } catch {
      return false;
    } finally {
      setSavingCount((n) => n - 1);
    }
  }

  async function deleteEntry(proposalId: string, entryId: string) {
    setSavingCount((n) => n + 1);
    try {
      const res = await fetch(`/api/agency/progress/${entryId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("server error");
      const remaining = (entries[proposalId] ?? []).filter((x) => x.id !== entryId);
      setEntries((e) => ({ ...e, [proposalId]: remaining }));
      const newStatus = remaining[0]?.status ?? "NOT_STARTED";
      setMeta((m) => ({ ...m, [proposalId]: { ...m[proposalId], status: newStatus } }));
    } catch {
      // ignore
    } finally {
      setSavingCount((n) => n - 1);
    }
  }

  const festivals = Array.from(new Map(proposals.map((p) => [p.festival.id, p.festival])).values());

  function isPending(p: Proposal) {
    const m = meta[p.id];
    const status = m?.status ?? "NOT_STARTED";
    const entryCount = entries[p.id]?.length ?? 0;
    return status === "NOT_STARTED" && entryCount === 0;
  }

  const byFestival = selectedFestival === "all" ? proposals : proposals.filter((p) => p.festival.id === selectedFestival);
  const filtered = showOnlyPending ? byFestival.filter(isPending) : byFestival;
  const pendingCount = byFestival.filter(isPending).length;

  const total = proposals.length;
  const filled = proposals.filter((p) => {
    const m = meta[p.id];
    return m && (m.status !== "NOT_STARTED" || (entries[p.id]?.length ?? 0) > 0);
  }).length;
  const completed = proposals.filter((p) => meta[p.id]?.status === "COMPLETED").length;
  const inProg = proposals.filter((p) => meta[p.id]?.status === "IN_PROGRESS").length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  const hasDirty = Object.values(dirty).some(Boolean);
  const hasError = Object.values(saveError).some(Boolean);
  const errorCount = Object.values(saveError).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ระบบรายงานผล</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            หน่วยงาน: <span className="font-medium text-gray-700">{agencyName}</span>
          </p>
        </div>
        {/* Global save status */}
        <div className="shrink-0 pt-1">
          {savingCount > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" /> กำลังบันทึก...
            </span>
          ) : hasError ? (
            <span className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle size={12} /> บันทึกไม่สำเร็จ {errorCount} รายการ
            </span>
          ) : hasDirty ? (
            <span className="text-xs text-amber-500">● รอบันทึก</span>
          ) : total > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={12} /> บันทึกแล้ว
            </span>
          ) : null}
        </div>
      </div>

      {/* First-login banner */}
      {isDefaultPassword && activeTab !== "password" && (
        <button
          onClick={() => setActiveTab("password")}
          className="w-full flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left hover:bg-amber-100 transition-colors"
        >
          <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">แนะนำ: เปลี่ยนรหัสผ่านก่อนใช้งาน</p>
            <p className="text-xs text-amber-600 mt-0.5">คุณยังใช้รหัสผ่านชั่วคราวจากแอดมิน กดที่นี่เพื่อเปลี่ยน →</p>
          </div>
        </button>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {(["proposals", "messages", "password"] as const).map((tab) => {
            const Icon = tab === "proposals" ? FileText : tab === "messages" ? MessageCircle : KeyRound;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "messages") setUnreadAdminCount(0);
                }}
                className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={15} />
                {tab === "proposals" && (
                  <><span className="sm:hidden">กรอกผล</span><span className="hidden sm:inline">กรอกผลการดำเนินงาน</span></>
                )}
                {tab === "messages" && "ข้อความ"}
                {tab === "password" && "รหัสผ่าน"}
                {tab === "messages" && unreadAdminCount > 0 && (
                  <span className="ml-0.5 bg-blue-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                    {unreadAdminCount}
                  </span>
                )}
                {tab === "password" && isDefaultPassword && (
                  <span className="absolute top-2 right-1 w-2 h-2 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === "messages" && <AgencyMessages />}
      {activeTab === "password" && (
        <AgencyPasswordChange onChanged={() => setIsDefaultPassword(false)} />
      )}

      {activeTab === "proposals" && (
        <>
          {/* Progress summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">ความคืบหน้าของคุณ</p>
              <span className={`text-sm font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-gray-400"}`}>
                {filled}/{total} ข้อ ({pct}%)
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-gray-300"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />ดำเนินการแล้ว {completed}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />กำลังดำเนินการ {inProg}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />ยังไม่เริ่ม {total - filled}</span>
            </div>
          </div>

          {/* วาระ filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFestival("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedFestival === "all" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              ทั้งหมด
            </button>
            {festivals.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFestival(f.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFestival === f.id
                    ? `${festTheme(f.type).bgSolid} text-white`
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {festIcon(f.type)} {sourceLabel(f)}
              </button>
            ))}
          </div>

          {/* Pending-only toggle */}
          {byFestival.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnlyPending((v) => !v)}
                disabled={pendingCount === 0 && !showOnlyPending}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  showOnlyPending
                    ? "bg-amber-100 border-amber-300 text-amber-800"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${showOnlyPending ? "bg-amber-500 border-amber-500" : "border-gray-300"}`}>
                  {showOnlyPending && <Check size={10} className="text-white" />}
                </span>
                แสดงเฉพาะที่ยังไม่รายงาน
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-white/60 rounded-full px-1.5 py-0.5">{pendingCount}</span>
                )}
              </button>
              {pendingCount === 0 && byFestival.length > 0 && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> รายงานครบทุกข้อแล้ว
                </span>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                {showOnlyPending && byFestival.length > 0
                  ? "รายงานครบทุกข้อในมุมมองนี้แล้ว"
                  : "ไม่มีข้อเสนอที่เกี่ยวข้องกับหน่วยงานของคุณ"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((proposal) => (
                <ProposalProgressCard
                  key={proposal.id}
                  proposal={proposal}
                  status={meta[proposal.id]?.status ?? "NOT_STARTED"}
                  evidenceUrl={meta[proposal.id]?.evidenceUrl ?? ""}
                  entries={entries[proposal.id] ?? []}
                  defaultContact={lastContact}
                  isError={!!saveError[proposal.id]}
                  isDirty={!!dirty[proposal.id]}
                  onAdd={(content, status, contactInfo) => addEntry(proposal.id, content, status, contactInfo)}
                  onUpdate={(id, content, status, contactInfo) => updateEntry(proposal.id, id, content, status, contactInfo)}
                  onDelete={(id) => deleteEntry(proposal.id, id)}
                  onEvidenceChange={(v) => handleEvidenceChange(proposal.id, v)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

function ProposalProgressCard({
  proposal,
  status,
  evidenceUrl,
  entries,
  defaultContact,
  isError,
  isDirty,
  onAdd,
  onUpdate,
  onDelete,
  onEvidenceChange,
}: {
  proposal: Proposal;
  status: string;
  evidenceUrl: string;
  entries: ProgressEntry[];
  defaultContact: ContactInfo;
  isError: boolean;
  isDirty: boolean;
  onAdd: (content: string, status: string, contact: ContactInfo) => Promise<boolean>;
  onUpdate: (id: string, content: string, status: string, contact: ContactInfo) => Promise<boolean>;
  onDelete: (id: string) => void;
  onEvidenceChange: (v: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [nowTs] = useState(() => Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    content: "",
    status: "IN_PROGRESS",
    contactName: "",
    contactTitle: "",
    contactPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function openAdd() {
    setEditingId(null);
    setDraft({
      content: "",
      status: "IN_PROGRESS",
      contactName: defaultContact.contactName,
      contactTitle: defaultContact.contactTitle,
      contactPhone: defaultContact.contactPhone,
    });
    setAdding(true);
  }

  function openEdit(entry: ProgressEntry) {
    setAdding(false);
    setEditingId(entry.id);
    setDraft({
      content: entry.content,
      status: entry.status,
      contactName: entry.contactName,
      contactTitle: entry.contactTitle,
      contactPhone: entry.contactPhone,
    });
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
  }

  const contactValid =
    !!draft.contactName.trim() && !!draft.contactTitle.trim() && !!draft.contactPhone.trim();
  const contentValid = !!draft.content.trim();
  const canSubmit = contactValid && contentValid;

  async function submit() {
    if (!canSubmit) return;
    if (draft.status === "NOT_RELEVANT") {
      const confirmed = confirm(
        "ยืนยัน \"ไม่เกี่ยวข้อง\"?\n\n" +
          "การติ๊กไม่เกี่ยวข้อง หมายถึงข้อเสนอนี้ไม่อยู่ในภารกิจของหน่วยงานคุณ " +
          "และจะถูกตัดออกจากตัวหารเปอร์เซ็นต์ของอนุฯ อย่างถาวร\n\n" +
          "หากเพียงแต่ยังไม่ได้เริ่ม โปรดเลือก \"กำลังดำเนินการ\" แทน"
      );
      if (!confirmed) return;
    }
    setSubmitting(true);
    const contactInfo: ContactInfo = {
      contactName: draft.contactName.trim(),
      contactTitle: draft.contactTitle.trim(),
      contactPhone: draft.contactPhone.trim(),
    };
    const ok = editingId
      ? await onUpdate(editingId, draft.content, draft.status, contactInfo)
      : await onAdd(draft.content, draft.status, contactInfo);
    setSubmitting(false);
    if (ok) cancel();
  }

  return (
    <Card
      className={`transition-all ${isError ? "border-l-4 border-l-red-400" : isDirty ? "border-l-4 border-l-amber-300" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-gray-400 font-medium">ข้อ {proposal.orderNumber}</span>
              <Badge variant={festTheme(proposal.festival.type).badgeVariant}>
                {festIcon(proposal.festival.type)} {sourceLabel(proposal.festival)}
              </Badge>
              {proposal.subCommittees.map((sc) => {
                const n = sc.subCommittee.name.match(/^C(\d+)/)?.[1];
                return (
                  <Badge key={sc.subCommittee.id} variant="gray">
                    {n ? `อนุฯ ${n}` : sc.subCommittee.name}
                  </Badge>
                );
              })}
              {proposal.festival.isPublic === false && <Badge variant="gray">🔒 เรื่องภายใน</Badge>}
              {proposal.dueDate && (() => {
                const due = new Date(proposal.dueDate);
                const late = status !== "COMPLETED" && status !== "NOT_RELEVANT" && due.getTime() < nowTs;
                return (
                  <Badge variant={late ? "danger" : "gray"}>
                    {late ? "เลยกำหนด" : "กำหนดเสร็จ"}{" "}
                    {due.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                  </Badge>
                );
              })()}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
            <CardTitle className="text-base">{proposal.title}</CardTitle>
            {proposal.description && (
              <p className="text-sm text-gray-500 mt-1">{proposal.description}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">ประวัติการรายงานความคืบหน้า</p>
            {!adding && !editingId && (
              <Button size="sm" onClick={openAdd}>
                <Plus size={13} /> เพิ่มรายงาน
              </Button>
            )}
          </div>

          {/* Add/Edit form */}
          {(adding || editingId) && (
            <div className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">สถานะ ณ การรายงานนี้</label>
                <div className="flex gap-2 flex-wrap">
                  {(["IN_PROGRESS", "COMPLETED", "NOT_RELEVANT"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, status: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        draft.status === s
                          ? s === "COMPLETED"
                            ? "bg-green-500 text-white border-green-500"
                            : s === "IN_PROGRESS"
                            ? "bg-yellow-500 text-white border-yellow-500"
                            : "bg-slate-400 text-white border-slate-400"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                {draft.status === "NOT_RELEVANT" && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      ใช้สถานะนี้เฉพาะเมื่อข้อเสนอ <span className="font-medium">ไม่อยู่ในภารกิจ</span> ของหน่วยงานคุณ
                      จะถูกตัดออกจากตัวหารเปอร์เซ็นต์ของอนุฯ อย่างถาวร
                      <span className="block mt-1 text-amber-600">หากเพียงยังไม่เริ่ม ให้เลือก &ldquo;กำลังดำเนินการ&rdquo; แทน</span>
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">
                  {draft.status === "NOT_RELEVANT" ? (
                    <>เหตุผลที่ไม่เกี่ยวข้อง <span className="text-red-500">*</span></>
                  ) : (
                    "รายละเอียดผลการดำเนินงาน"
                  )}
                </label>
                <AutoResizeTextarea
                  value={draft.content}
                  onChange={(v) => setDraft((d) => ({ ...d, content: v }))}
                  placeholder={
                    draft.status === "NOT_RELEVANT"
                      ? "เช่น ไม่อยู่ในขอบเขตภารกิจของกรม / ส่งต่อให้หน่วยงาน X รับผิดชอบโดยตรง"
                      : "อธิบายความคืบหน้าในช่วงนี้..."
                  }
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-white ${
                    !draft.content.trim() && draft.status === "NOT_RELEVANT" ? "border-red-200" : "border-gray-300"
                  }`}
                />
              </div>
              <div className="border-t border-emerald-200 pt-3">
                <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <User size={12} className="text-emerald-600" />
                  ข้อมูลผู้รายงาน <span className="text-red-500">*</span>
                  <span className="text-[10px] font-normal text-gray-400">(บังคับกรอกทั้ง 3 ช่อง)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={draft.contactName}
                    onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                    placeholder="ชื่อ-นามสกุล"
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                      !draft.contactName.trim() ? "border-red-200" : "border-gray-300"
                    }`}
                  />
                  <input
                    type="text"
                    value={draft.contactTitle}
                    onChange={(e) => setDraft((d) => ({ ...d, contactTitle: e.target.value }))}
                    placeholder="ตำแหน่ง"
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                      !draft.contactTitle.trim() ? "border-red-200" : "border-gray-300"
                    }`}
                  />
                  <input
                    type="text"
                    value={draft.contactPhone}
                    onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
                    placeholder="เบอร์โทรศัพท์"
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                      !draft.contactPhone.trim() ? "border-red-200" : "border-gray-300"
                    }`}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={submit} disabled={submitting || !canSubmit}>
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {editingId ? "บันทึกการแก้ไข" : "เพิ่มรายงาน"}
                </Button>
                <Button size="sm" variant="secondary" onClick={cancel} disabled={submitting}>
                  <X size={13} /> ยกเลิก
                </Button>
                {!canSubmit && (
                  <span className="text-xs text-red-500 self-center">กรอกข้อมูลให้ครบก่อน</span>
                )}
              </div>
            </div>
          )}

          {entries.length === 0 && !adding && !editingId && (
            <p className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-lg">
              ยังไม่มีรายงาน — กดปุ่ม &ldquo;เพิ่มรายงาน&rdquo; เพื่อเริ่มต้น
            </p>
          )}

          {entries.length > 0 && (
            <ol className="space-y-2 mt-3">
              {entries.map((entry, idx) => (
                <li
                  key={entry.id}
                  className={`relative pl-4 border-l-2 ${
                    idx === 0 ? "border-emerald-400" : "border-gray-200"
                  }`}
                >
                  <span
                    className={`absolute left-[-5px] top-1 w-2 h-2 rounded-full ${
                      idx === 0 ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-1">
                        <Clock size={11} />
                        <span>{formatThaiDate(entry.createdAt)}</span>
                        {entry.updatedAt !== entry.createdAt && (
                          <span className="text-gray-400">(แก้ไข {formatThaiDate(entry.updatedAt)})</span>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[entry.status]}`}
                        >
                          {STATUS_LABELS[entry.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {entry.content || <span className="italic text-gray-400">(ไม่เกี่ยวข้อง)</span>}
                      </p>
                      {entry.contactName && (
                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                          <User size={10} />
                          รายงานโดย {entry.contactName}
                          {entry.contactTitle && ` · ${entry.contactTitle}`}
                          {entry.contactPhone && ` · ${entry.contactPhone}`}
                        </p>
                      )}
                    </div>
                    {!editingId && !adding && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(entry)} title="แก้ไข">
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("ลบรายงานนี้?")) onDelete(entry.id);
                          }}
                          title="ลบ"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Evidence URL (per implementation, not per entry) */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1">
            <Link2 size={13} className="text-gray-400" />
            ลิงก์หลักฐาน
            <span className="text-xs font-normal text-gray-400">(ไม่บังคับ — Google Drive, OneDrive ฯลฯ)</span>
          </label>
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => onEvidenceChange(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {isError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0" />
            บันทึกไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
          </div>
        )}
      </CardContent>
    </Card>
  );
}
