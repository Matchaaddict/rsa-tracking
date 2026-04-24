"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import { ChevronDown, ChevronRight, Sparkles, Loader2, CheckCircle2, Circle } from "lucide-react";

interface ProposalDetail {
  id: string;
  title: string;
  orderNumber: number;
  status: string;
  hasContent: boolean;
  answered: boolean;
  content: string | null;
}

interface AgencyAnalysis {
  id: string;
  name: string;
  totalProposals: number;
  answered: number;
  proposals: ProposalDetail[];
}

interface Festival {
  id: string;
  name: string;
}

function completionColor(pct: number) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 50) return "text-yellow-600";
  return "text-red-500";
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return <h3 key={i} className="text-sm font-bold mt-4 mb-1 text-gray-900">{line.slice(3)}</h3>;
    }
    if (line.startsWith("### ")) {
      return <h4 key={i} className="text-sm font-semibold mt-3 mb-0.5 text-gray-800">{line.slice(4)}</h4>;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1");
      return <li key={i} className="ml-4 list-disc text-sm text-gray-700">{content}</li>;
    }
    if (/^\d+\./.test(line)) {
      const content = line.replace(/^\d+\.\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1");
      return <li key={i} className="ml-4 list-decimal text-sm text-gray-700">{content}</li>;
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    const content = line.replace(/\*\*(.*?)\*\*/g, (_, m) => `__BOLD__${m}__BOLD__`);
    const parts = content.split("__BOLD__");
    return (
      <p key={i} className="text-sm text-gray-700">
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
      </p>
    );
  });
}

export function AnalysisPanel() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<{ festival: Festival; agencies: AgencyAnalysis[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/festivals")
      .then((r) => r.json())
      .then((list) => {
        setFestivals(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setData(null);
    setExpanded(new Set());
    setAiText({});
    fetch(`/api/admin/analysis?festivalId=${selectedId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [selectedId]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function runAi(agencyId: string) {
    setAiLoading((prev) => ({ ...prev, [agencyId]: true }));
    setAiText((prev) => ({ ...prev, [agencyId]: "" }));
    if (!expanded.has(agencyId)) toggleExpand(agencyId);

    const res = await fetch("/api/admin/analysis/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyId, festivalId: selectedId }),
    });

    if (!res.body) { setAiLoading((prev) => ({ ...prev, [agencyId]: false })); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      setAiText((prev) => ({ ...prev, [agencyId]: (prev[agencyId] ?? "") + chunk }));
    }
    setAiLoading((prev) => ({ ...prev, [agencyId]: false }));
  }

  const totalAgencies = data?.agencies.length ?? 0;
  const fullAnswered = data?.agencies.filter((a) => a.answered === a.totalProposals).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">วิเคราะห์ความคืบหน้า</h2>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {festivals.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-500" size={24} />
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalAgencies}</div>
              <div className="text-xs text-gray-500 mt-0.5">หน่วยงานที่มีข้อเสนอ</div>
            </CardContent></Card>
            <Card><CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-green-600">{fullAnswered}</div>
              <div className="text-xs text-gray-500 mt-0.5">ตอบครบทุกข้อ</div>
            </CardContent></Card>
            <Card><CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-red-500">{totalAgencies - fullAnswered}</div>
              <div className="text-xs text-gray-500 mt-0.5">ยังตอบไม่ครบ</div>
            </CardContent></Card>
          </div>

          <div className="space-y-2">
            {[...data.agencies]
              .sort((a, b) => a.answered / a.totalProposals - b.answered / b.totalProposals)
              .map((agency) => {
                const pct = Math.round((agency.answered / agency.totalProposals) * 100);
                const isOpen = expanded.has(agency.id);
                const analysis = aiText[agency.id];
                const isLoadingAi = aiLoading[agency.id];

                return (
                  <Card key={agency.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleExpand(agency.id)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          {isOpen ? <ChevronDown size={15} className="text-gray-400 shrink-0" /> : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 text-sm truncate">{agency.name}</span>
                              <span className={`text-sm font-semibold ml-2 shrink-0 ${completionColor(pct)}`}>
                                {agency.answered}/{agency.totalProposals} ({pct}%)
                              </span>
                            </div>
                            <ProgressBar value={agency.answered} total={agency.totalProposals} />
                          </div>
                        </button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => runAi(agency.id)}
                          disabled={isLoadingAi}
                          className="shrink-0"
                        >
                          {isLoadingAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          วิเคราะห์ AI
                        </Button>
                      </div>

                      {isOpen && (
                        <div className="mt-3 space-y-1 border-t pt-3">
                          {agency.proposals.map((p) => (
                            <div key={p.id} className="flex items-start gap-2 py-1">
                              {p.answered
                                ? <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                                : <Circle size={14} className="text-gray-300 mt-0.5 shrink-0" />
                              }
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-gray-800">
                                    <span className="text-gray-400 mr-1">#{p.orderNumber}</span>
                                    {p.title}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                                    {STATUS_LABELS[p.status] ?? p.status}
                                  </span>
                                </div>
                                {p.content && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.content}</p>
                                )}
                              </div>
                            </div>
                          ))}

                          {(analysis || isLoadingAi) && (
                            <div className="mt-4 border-t pt-3">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 mb-2">
                                <Sparkles size={12} />
                                การวิเคราะห์เชิงคุณภาพโดย AI
                                {isLoadingAi && <Loader2 size={11} className="animate-spin ml-1" />}
                              </div>
                              <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 space-y-0.5">
                                {renderMarkdown(analysis ?? "")}
                                {isLoadingAi && <span className="inline-block w-2 h-3 bg-purple-400 animate-pulse rounded-sm" />}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
