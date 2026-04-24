"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { STATUS_LABELS, STATUS_COLORS, FESTIVAL_TYPE_LABELS } from "@/lib/utils";
import { Loader2, Save, CheckCircle2, FileText, MessageCircle, KeyRound, ShieldAlert } from "lucide-react";
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

export function AgencyDashboard({ agencyName }: { agencyId: string; agencyName: string }) {
  const [activeTab, setActiveTab] = useState<"proposals" | "messages" | "password">("proposals");
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [selectedFestival, setSelectedFestival] = useState<string>("all");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/agency/implementations");
    const data = await res.json();
    setProposals(data.proposals || []);

    const initialForms: Record<string, FormState> = {};
    (data.proposals || []).forEach((p: Proposal) => {
      const impl = p.implementations[0];
      initialForms[p.id] = {
        content: impl?.content || "",
        status: impl?.status || "NOT_STARTED",
      };
    });
    setForms(initialForms);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    fetch("/api/agency/password").then(r => r.json()).then(d => setIsDefaultPassword(d.isDefaultPassword));
  }, [fetchData]);

  async function handleSave(proposalId: string) {
    setSaving((s) => ({ ...s, [proposalId]: true }));
    await fetch("/api/agency/implementations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, ...forms[proposalId] }),
    });
    setSaving((s) => ({ ...s, [proposalId]: false }));
    setSaved((s) => ({ ...s, [proposalId]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [proposalId]: false })), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={36} />
      </div>
    );
  }

  const festivals = Array.from(
    new Map(proposals.map((p) => [p.festival.id, p.festival])).values()
  );

  const filtered =
    selectedFestival === "all"
      ? proposals
      : proposals.filter((p) => p.festival.id === selectedFestival);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ระบบรายงานผล</h1>
        <p className="text-gray-500 mt-1">
          หน่วยงาน: <span className="font-medium text-gray-700">{agencyName}</span>
        </p>
      </div>

      {/* First-login banner */}
      {isDefaultPassword && activeTab !== "password" && (
        <button onClick={() => setActiveTab("password")}
          className="w-full flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left hover:bg-amber-100 transition-colors">
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
          <button
            onClick={() => setActiveTab("proposals")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "proposals" ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText size={15} /> กรอกผลการดำเนินงาน
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "messages" ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <MessageCircle size={15} /> ถามแอดมิน
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
              activeTab === "password" ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <KeyRound size={15} /> รหัสผ่าน
            {isDefaultPassword && <span className="absolute top-2 right-1 w-2 h-2 bg-amber-400 rounded-full" />}
          </button>
        </nav>
      </div>

      {activeTab === "messages" && <AgencyMessages />}
      {activeTab === "password" && <AgencyPasswordChange />}
      {activeTab === "proposals" && (<>

      {/* Festival filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedFestival("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedFestival === "all"
              ? "bg-emerald-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
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
                ? f.type === "NEW_YEAR"
                  ? "bg-blue-600 text-white"
                  : "bg-orange-500 text-white"
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

            return (
              <Card key={proposal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-gray-400 font-medium">
                          ข้อ {proposal.orderNumber}
                        </span>
                        <Badge
                          variant={
                            proposal.festival.type === "NEW_YEAR" ? "default" : "warning"
                          }
                        >
                          {FESTIVAL_TYPE_LABELS[proposal.festival.type]} {proposal.festival.year}
                        </Badge>
                        {proposal.subCommittees.map((sc) => (
                          <Badge key={sc.subCommittee.id} variant="gray">
                            {sc.subCommittee.name}
                          </Badge>
                        ))}
                      </div>
                      <CardTitle className="text-base">{proposal.title}</CardTitle>
                      {proposal.description && (
                        <p className="text-sm text-gray-500 mt-1">{proposal.description}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[form.status]}`}
                    >
                      {STATUS_LABELS[form.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Status selector */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      สถานะการดำเนินงาน
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NOT_RELEVANT"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            setForms((f) => ({ ...f, [proposal.id]: { ...form, status: s } }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            form.status === s
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
                  </div>

                  {/* Content — ซ่อนเมื่อเลือก ไม่เกี่ยวข้อง */}
                  {form.status !== "NOT_RELEVANT" && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        รายละเอียดผลการดำเนินงาน
                      </label>
                      <textarea
                        rows={3}
                        value={form.content}
                        onChange={(e) =>
                          setForms((f) => ({
                            ...f,
                            [proposal.id]: { ...form, content: e.target.value },
                          }))
                        }
                        placeholder="อธิบายผลการดำเนินงาน..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSave(proposal.id)}
                      disabled={saving[proposal.id]}
                      className={`gap-2 ${
                        saved[proposal.id]
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                      size="sm"
                    >
                      {saving[proposal.id] ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : saved[proposal.id] ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Save size={14} />
                      )}
                      {saved[proposal.id] ? "บันทึกแล้ว" : "บันทึก"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </>)}
    </div>
  );
}
