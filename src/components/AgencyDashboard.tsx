"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { STATUS_LABELS, STATUS_COLORS, FESTIVAL_TYPE_LABELS } from "@/lib/utils";
import { Loader2, FileText, MessageCircle, KeyRound, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { AgencyMessages } from "./AgencyMessages";
import { AgencyPasswordChange } from "./AgencyPasswordChange";

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

interface Implementation {
  id?: string;
  status: string;
  content: string | null;
}

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  orderNumber: number;
  festival: Festival;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: Implementation[];
}

interface FormState {
  content: string;
  status: string;
}

function buildInitialForms(proposals: Proposal[]): Record<string, FormState> {
  const forms: Record<string, FormState> = {};
  proposals.forEach((p) => {
    const impl = p.implementations[0];
    forms[p.id] = { content: impl?.content || "", status: impl?.status || "NOT_STARTED" };
  });
  return forms;
}

export function AgencyDashboard({
  agencyName,
  initialProposals,
  isDefaultPassword: initialIsDefault,
}: {
  agencyName: string;
  initialProposals: Proposal[];
  isDefaultPassword: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"proposals" | "messages" | "password">("proposals");
  const [isDefaultPassword, setIsDefaultPassword] = useState(initialIsDefault);
  const [proposals] = useState<Proposal[]>(initialProposals);
  const [forms, setForms] = useState<Record<string, FormState>>(() => buildInitialForms(initialProposals));
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<Record<string, boolean>>({});
  const [savingCount, setSavingCount] = useState(0);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Warn before closing/navigating away if there are unsaved or pending changes
  useEffect(() => {
    const hasPending = Object.values(dirty).some(Boolean) || Object.values(saveError).some(Boolean);
    if (!hasPending) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saveError]);

  async function autoSave(proposalId: string, formData: FormState) {
    setSavingCount((n) => n + 1);
    setSaveError((e) => ({ ...e, [proposalId]: false }));
    try {
      const res = await fetch("/api/agency/implementations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, ...formData }),
      });
      if (!res.ok) throw new Error("server error");
      setDirty((d) => ({ ...d, [proposalId]: false }));
    } catch {
      setSaveError((e) => ({ ...e, [proposalId]: true }));
    } finally {
      setSavingCount((n) => n - 1);
    }
  }

  function handleStatusChange(proposalId: string, status: string) {
    const newForm = { ...forms[proposalId], status };
    setForms((f) => ({ ...f, [proposalId]: newForm }));
    setDirty((d) => ({ ...d, [proposalId]: true }));
    clearTimeout(timers.current[proposalId]);
    autoSave(proposalId, newForm);
  }

  function handleContentChange(proposalId: string, content: string) {
    const newForm = { ...forms[proposalId], content };
    setForms((f) => ({ ...f, [proposalId]: newForm }));
    setDirty((d) => ({ ...d, [proposalId]: true }));
    clearTimeout(timers.current[proposalId]);
    timers.current[proposalId] = setTimeout(() => autoSave(proposalId, newForm), 1500);
  }

  const festivals = Array.from(new Map(proposals.map((p) => [p.festival.id, p.festival])).values());
  const filtered = selectedFestival === "all" ? proposals : proposals.filter((p) => p.festival.id === selectedFestival);

  const total = proposals.length;
  const filled = proposals.filter((p) => {
    const f = forms[p.id];
    return f && (f.status !== "NOT_STARTED" || f.content.trim() !== "");
  }).length;
  const completed = proposals.filter((p) => forms[p.id]?.status === "COMPLETED").length;
  const inProg = proposals.filter((p) => forms[p.id]?.status === "IN_PROGRESS").length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  const hasDirty = Object.values(dirty).some(Boolean);
  const hasError = Object.values(saveError).some(Boolean);
  const errorCount = Object.values(saveError).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ระบบรายงานผล</h1>
          <p className="text-gray-500 mt-1">
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
        <nav className="flex gap-1">
          {(["proposals", "messages", "password"] as const).map((tab) => {
            const label = tab === "proposals" ? "กรอกผลการดำเนินงาน" : tab === "messages" ? "ถามแอดมิน" : "รหัสผ่าน";
            const Icon = tab === "proposals" ? FileText : tab === "messages" ? MessageCircle : KeyRound;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={15} /> {label}
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
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />ดำเนินการแล้ว {completed}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />กำลังดำเนินการ {inProg}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />ยังไม่เริ่ม {total - filled}</span>
            </div>
          </div>

          {/* Festival filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFestival("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedFestival === "all" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              ทุกเทศกาล
            </button>
            {festivals.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFestival(f.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFestival === f.id
                    ? f.type === "NEW_YEAR" ? "bg-blue-600 text-white" : "bg-orange-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {FESTIVAL_TYPE_LABELS[f.type]} {f.year}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                ไม่มีข้อเสนอที่เกี่ยวข้องกับหน่วยงานของคุณ
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((proposal) => {
                const form = forms[proposal.id] || { content: "", status: "NOT_STARTED" };
                const isDirty = dirty[proposal.id];
                const isError = saveError[proposal.id];

                return (
                  <Card
                    key={proposal.id}
                    className={`transition-all ${isError ? "border-l-4 border-l-red-400" : isDirty ? "border-l-4 border-l-amber-300" : ""}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-gray-400 font-medium">ข้อ {proposal.orderNumber}</span>
                            <Badge variant={proposal.festival.type === "NEW_YEAR" ? "default" : "warning"}>
                              {FESTIVAL_TYPE_LABELS[proposal.festival.type]} {proposal.festival.year}
                            </Badge>
                            {proposal.subCommittees.map((sc) => (
                              <Badge key={sc.subCommittee.id} variant="gray">{sc.subCommittee.name}</Badge>
                            ))}
                          </div>
                          <CardTitle className="text-base">{proposal.title}</CardTitle>
                          {proposal.description && (
                            <p className="text-sm text-gray-500 mt-1">{proposal.description}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[form.status]}`}>
                          {STATUS_LABELS[form.status]}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {/* Status selector */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">สถานะการดำเนินงาน</label>
                        <div className="flex gap-2 flex-wrap">
                          {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NOT_RELEVANT"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(proposal.id, s)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                form.status === s
                                  ? s === "COMPLETED" ? "bg-green-500 text-white border-green-500"
                                    : s === "IN_PROGRESS" ? "bg-yellow-500 text-white border-yellow-500"
                                    : s === "NOT_RELEVANT" ? "bg-slate-400 text-white border-slate-400"
                                    : "bg-gray-400 text-white border-gray-400"
                                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {form.status !== "NOT_RELEVANT" && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">รายละเอียดผลการดำเนินงาน</label>
                          <textarea
                            rows={3}
                            value={form.content}
                            onChange={(e) => handleContentChange(proposal.id, e.target.value)}
                            placeholder="อธิบายผลการดำเนินงาน..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                          />
                        </div>
                      )}

                      {isError && (
                        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle size={14} className="shrink-0" />
                            บันทึกไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => autoSave(proposal.id, forms[proposal.id])}
                            className="shrink-0 text-red-600 border-red-200 hover:bg-red-100"
                          >
                            <RefreshCw size={13} /> ลองใหม่
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
