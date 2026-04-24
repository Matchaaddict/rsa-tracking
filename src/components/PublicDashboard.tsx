"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { STATUS_LABELS, STATUS_COLORS, FESTIVAL_TYPE_LABELS } from "@/lib/utils";
import {
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { FAQSection } from "./FAQSection";

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
}

interface Implementation {
  id: string;
  agencyId: string;
  proposalId: string;
  content: string | null;
  status: string;
  agency: Agency;
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
}

interface AgencyData {
  id: string;
  name: string;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: { status: string; content: string | null; proposal: { festival: Festival } }[];
}

interface DashboardData {
  festivals: Festival[];
  proposals: Proposal[];
  agencies: AgencyData[];
  subCommittees: SubCommittee[];
  siteConfig: Record<string, string>;
  stats: {
    totalAgencies: number;
    agenciesWithData: number;
    totalProposals: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    totalImplementations: number;
  };
}

const PIE_COLORS = ["#22c55e", "#eab308", "#9ca3af"];

export function PublicDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [expandedSubCommittees, setExpandedSubCommittees] = useState<Set<string>>(new Set());
  const [expandedFestivals, setExpandedFestivals] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"proposals" | "agencies" | "subcommittees">("proposals");
  const [expandedSCTab, setExpandedSCTab] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  function toggleSC(id: string) {
    setExpandedSubCommittees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleFestival(key: string) {
    setExpandedFestivals((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  if (!data) return null;

  const filteredProposals =
    selectedFestival === "all"
      ? data.proposals
      : data.proposals.filter((p) => p.festivalId === selectedFestival);

  // ไม่นับ NOT_RELEVANT ใน total
  const totalImplementationsForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status !== "NOT_RELEVANT").length,
    0
  );
  const completedForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status === "COMPLETED").length,
    0
  );
  const inProgressForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status === "IN_PROGRESS").length,
    0
  );
  const notStartedForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status === "NOT_STARTED").length,
    0
  );

  const agenciesWithDataForFilter = new Set(
    filteredProposals.flatMap((p) =>
      p.implementations
        .filter((i) => i.content && i.status !== "NOT_RELEVANT")
        .map((i) => i.agencyId)
    )
  ).size;

  const pieData = [
    { name: STATUS_LABELS.COMPLETED, value: completedForFilter },
    { name: STATUS_LABELS.IN_PROGRESS, value: inProgressForFilter },
    { name: STATUS_LABELS.NOT_STARTED, value: notStartedForFilter },
  ].filter((d) => d.value > 0);

  const barData = filteredProposals.map((p) => ({
    name: `ข้อ ${p.orderNumber}`,
    label: p.title.slice(0, 20) + (p.title.length > 20 ? "…" : ""),
    completed: p.implementations.filter((i) => i.status === "COMPLETED").length,
    inProgress: p.implementations.filter((i) => i.status === "IN_PROGRESS").length,
    notStarted: p.implementations.filter((i) => i.status === "NOT_STARTED").length,
  }));

  const overallPct =
    totalImplementationsForFilter > 0
      ? Math.round((completedForFilter / totalImplementationsForFilter) * 100)
      : 0;
  const ringR = 52;
  const ringCirc = 2 * Math.PI * ringR;
  const ringFilled = (overallPct / 100) * ringCirc;

  return (
    <div className="min-h-screen bg-gray-50">
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2460] via-[#1a3a8a] to-[#1e3a8a] rounded-3xl text-white shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)", backgroundSize: "60px 60px, 80px 80px, 50px 50px" }} />

        <div className="relative flex flex-col lg:flex-row items-center gap-6 px-6 pt-8 pb-6">
          {/* Left: text + ring + stats */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              {/* Completion Ring */}
              <svg width={100} height={100} viewBox="0 0 130 130" className="shrink-0">
                <circle cx={65} cy={65} r={ringR} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={12} />
                <circle cx={65} cy={65} r={ringR} fill="none"
                  stroke="#34d399" strokeWidth={12}
                  strokeDasharray={`${ringFilled} ${ringCirc}`}
                  strokeLinecap="round"
                  transform="rotate(-90 65 65)"
                />
                <text x={65} y={60} textAnchor="middle" fill="white" style={{ fontSize: 26, fontWeight: 700 }}>{overallPct}%</text>
                <text x={65} y={78} textAnchor="middle" fill="rgba(255,255,255,0.6)" style={{ fontSize: 11 }}>ภาพรวม</text>
              </svg>
              <div>
                <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase">{data.siteConfig.hero_label ?? "RSAT"}</p>
                <h1 className="text-lg sm:text-2xl font-bold leading-snug mt-0.5">
                  {data.siteConfig.hero_title ?? "ระบบติดตามข้อเสนอแนวทางป้องกันและลดอุบัติเหตุทางถนน"}
                </h1>
                <p className="text-blue-300 text-sm mt-1">{data.siteConfig.hero_subtitle ?? "ในช่วงการรณรงค์เทศกาล ฯ"}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "หน่วยงานกรอกข้อมูล", value: agenciesWithDataForFilter, icon: "🏢", color: "from-white/10 to-white/5" },
                { label: "ข้อเสนอทั้งหมด", value: filteredProposals.length, icon: "📋", color: "from-white/10 to-white/5" },
                { label: "ดำเนินการแล้ว", value: completedForFilter, icon: "✅", color: "from-emerald-500/20 to-emerald-600/10" },
                { label: "กำลังดำเนินการ", value: inProgressForFilter, icon: "⚡", color: "from-amber-500/20 to-amber-600/10" },
              ].map((s) => (
                <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl px-3 py-2.5 border border-white/10`}>
                  <div className="text-xl mb-0.5">{s.icon}</div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-blue-200 text-xs leading-tight mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: SVG Illustration */}
          <div className="shrink-0 lg:w-64">
            <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto">
              {/* Glow */}
              <ellipse cx="130" cy="95" rx="110" ry="75" fill="rgba(99,102,241,0.12)"/>
              {/* Shield */}
              <path d="M130 18 L192 48 L192 108 Q192 155 130 170 Q68 155 68 108 L68 48 Z"
                fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              {/* Road */}
              <path d="M25 158 Q90 130 130 115 Q170 100 235 115"
                stroke="rgba(255,255,255,0.15)" strokeWidth="24" strokeLinecap="round"/>
              <path d="M25 158 Q90 130 130 115 Q170 100 235 115"
                stroke="rgba(30,58,138,0.6)" strokeWidth="20" strokeLinecap="round"/>
              {/* Road center line */}
              <path d="M40 155 Q100 130 130 116 Q165 103 220 113"
                stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="14 10" strokeLinecap="round"/>
              {/* Car 1 */}
              <g transform="translate(104,111) rotate(-7)">
                <rect x="-18" y="-8" width="36" height="16" rx="6" fill="rgba(255,255,255,0.18)"/>
                <rect x="-12" y="-16" width="26" height="12" rx="4" fill="rgba(255,255,255,0.22)"/>
                <circle cx="-10" cy="8" r="4.5" fill="rgba(255,255,255,0.45)"/>
                <circle cx="10" cy="8" r="4.5" fill="rgba(255,255,255,0.45)"/>
                <rect x="-4" y="-15" width="8" height="4" rx="1" fill="rgba(147,197,253,0.5)"/>
              </g>
              {/* Car 2 */}
              <g transform="translate(183,104) rotate(-3)">
                <rect x="-13" y="-6" width="26" height="12" rx="4" fill="rgba(255,255,255,0.12)"/>
                <rect x="-8" y="-12" width="18" height="9" rx="3" fill="rgba(255,255,255,0.15)"/>
                <circle cx="-7" cy="7" r="3.5" fill="rgba(255,255,255,0.32)"/>
                <circle cx="7" cy="7" r="3.5" fill="rgba(255,255,255,0.32)"/>
              </g>
              {/* Checkmark */}
              <path d="M108 92 L124 108 L158 70"
                stroke="#34d399" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Data nodes */}
              <circle cx="88" cy="38" r="5" fill="rgba(52,211,153,0.35)" stroke="rgba(52,211,153,0.7)" strokeWidth="1.5"/>
              <circle cx="130" cy="26" r="6" fill="rgba(52,211,153,0.45)" stroke="rgba(52,211,153,0.8)" strokeWidth="1.5"/>
              <circle cx="172" cy="38" r="5" fill="rgba(52,211,153,0.35)" stroke="rgba(52,211,153,0.7)" strokeWidth="1.5"/>
              <path d="M88 38 L130 26 L172 38" stroke="rgba(52,211,153,0.3)" strokeWidth="1.5"/>
              {/* Decorative dots */}
              <circle cx="45" cy="52" r="3" fill="rgba(255,255,255,0.15)"/>
              <circle cx="58" cy="68" r="2" fill="rgba(255,255,255,0.1)"/>
              <circle cx="205" cy="55" r="3" fill="rgba(255,255,255,0.15)"/>
              <circle cx="218" cy="72" r="2" fill="rgba(255,255,255,0.1)"/>
              <circle cx="44" cy="80" r="2" fill="rgba(255,255,255,0.08)"/>
              <circle cx="216" cy="88" r="2" fill="rgba(255,255,255,0.08)"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Sub-committee Progress */}
      {(() => {
        const scStats = new Map<string, { done: number; total: number }>();
        filteredProposals.forEach((p) => {
          p.subCommittees.forEach(({ subCommittee }) => {
            if (!scStats.has(subCommittee.id))
              scStats.set(subCommittee.id, { done: 0, total: 0 });
            const e = scStats.get(subCommittee.id)!;
            p.implementations.forEach((i) => {
              if (i.status === "NOT_RELEVANT") return;
              e.total++;
              if (i.status === "COMPLETED") e.done++;
            });
          });
        });
        const rows = data.subCommittees
          .map((sc) => {
            const s = scStats.get(sc.id) ?? { done: 0, total: 0 };
            return { name: sc.name.replace(/^C\d+:\s*/, ""), pct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0, done: s.done, total: s.total };
          })
          .sort((a, b) => b.pct - a.pct);
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-blue-600 rounded-full" />
              <p className="text-sm font-semibold text-gray-700">ความคืบหน้าในการขับเคลื่อนรายอนุกรรมการ</p>
            </div>
            <div className="space-y-3">
              {rows.map((sc, idx) => (
                <div key={sc.name} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{
                      background: sc.pct >= 70 ? "linear-gradient(135deg,#10b981,#059669)" :
                                  sc.pct >= 40 ? "linear-gradient(135deg,#3b82f6,#2563eb)" :
                                  sc.pct > 0   ? "linear-gradient(135deg,#f59e0b,#d97706)" :
                                                 "#e5e7eb",
                      color: sc.pct > 0 ? "white" : "#9ca3af",
                    }}>
                    {idx + 1}
                  </div>
                  <div className="w-28 sm:w-44 shrink-0">
                    <p className="text-xs text-gray-600 leading-snug line-clamp-2">{sc.name}</p>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700 ${
                          sc.pct >= 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                          sc.pct >= 40 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                          sc.pct > 0   ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                                         "bg-gray-200"
                        }`}
                        style={{ width: `${Math.max(sc.pct, sc.pct > 0 ? 4 : 0)}%` }}
                      >
                        {sc.pct >= 18 && <span className="text-white text-xs font-bold">{sc.pct}%</span>}
                      </div>
                    </div>
                    {sc.pct > 0 && sc.pct < 18 && (
                      <span className="absolute left-2 top-0.5 text-xs font-bold text-gray-500">{sc.pct}%</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 w-10 text-right tabular-nums">{sc.done}/{sc.total}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Festival Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400 font-medium mr-1">กรองตามเทศกาล:</span>
        <button
          onClick={() => setSelectedFestival("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
            selectedFestival === "all"
              ? "bg-gray-800 text-white border-gray-800 shadow-sm"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
          }`}
        >
          ทุกเทศกาล
        </button>
        {data.festivals.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFestival(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              selectedFestival === f.id
                ? f.type === "NEW_YEAR"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
            }`}
          >
            {f.type === "NEW_YEAR" ? "🎆" : "💦"} {FESTIVAL_TYPE_LABELS[f.type]} {f.year}
          </button>
        ))}
      </div>


      {/* Charts */}
      {totalImplementationsForFilter > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-1">สัดส่วนสถานะการดำเนินงาน</p>
            <p className="text-xs text-gray-400 mb-3">ทั้งหมด {totalImplementationsForFilter} รายการ</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={58} outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                  label={false} labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 13 }}
                  formatter={(value) => [`${value} รายการ`]}
                />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {barData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">ความคืบหน้ารายข้อเสนอ</p>
              <p className="text-xs text-gray-400 mb-3">จำนวนหน่วยงานต่อสถานะ</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={14}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 13 }}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        completed: STATUS_LABELS.COMPLETED,
                        inProgress: STATUS_LABELS.IN_PROGRESS,
                        notStarted: STATUS_LABELS.NOT_STARTED,
                      };
                      return [`${value} หน่วยงาน`, labels[name as string] || name];
                    }}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="completed" />
                  <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="inProgress" />
                  <Bar dataKey="notStarted" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="notStarted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "proposals", label: "รายข้อเสนอ", count: filteredProposals.length },
          { key: "subcommittees", label: "รายอนุกรรมการ", count: data.subCommittees.length },
          { key: "agencies", label: "รายหน่วยงาน", count: data.agencies.length },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Proposals Tab */}
      {activeTab === "proposals" && (
        <div className="space-y-3">
          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                ยังไม่มีข้อเสนอ
              </CardContent>
            </Card>
          ) : (() => {
            // Group proposals by sub-committee
            const scMap = new Map<string, { sc: SubCommittee; proposals: Proposal[] }>();
            filteredProposals.forEach((p) => {
              p.subCommittees.forEach(({ subCommittee }) => {
                if (!scMap.has(subCommittee.id)) {
                  scMap.set(subCommittee.id, { sc: subCommittee, proposals: [] });
                }
                scMap.get(subCommittee.id)!.proposals.push(p);
              });
            });

            return Array.from(scMap.values()).map(({ sc, proposals }) => {
              // Aggregate stats for this SC group
              const scDone = proposals.reduce(
                (a, p) => a + p.implementations.filter((i) => i.status === "COMPLETED").length, 0
              );
              const scTotal = proposals.reduce(
                (a, p) => a + p.implementations.filter((i) => i.status !== "NOT_RELEVANT").length, 0
              );
              const scPct = scTotal > 0 ? Math.round((scDone / scTotal) * 100) : 0;
              const isOpen = expandedSubCommittees.has(sc.id);

              return (
                <div key={sc.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  {/* SC Header */}
                  <button
                    onClick={() => toggleSC(sc.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen
                        ? <ChevronUp size={18} className="text-blue-500 shrink-0" />
                        : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                      <div>
                        <p className="font-semibold text-gray-900">{sc.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{proposals.length} ข้อเสนอ</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-blue-600">{scPct}%</p>
                      <p className="text-xs text-gray-400">เสร็จ {scDone}/{scTotal}</p>
                    </div>
                  </button>

                  {/* SC Progress bar */}
                  <div className="h-1 bg-gray-100">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${scPct}%` }}
                    />
                  </div>

                  {/* Festival sub-groups inside each SC */}
                  {isOpen && (() => {
                    // Group proposals in this SC by festival
                    const festMap = new Map<string, { festival: Festival; proposals: Proposal[] }>();
                    proposals.forEach((p) => {
                      if (!festMap.has(p.festivalId)) {
                        festMap.set(p.festivalId, { festival: p.festival, proposals: [] });
                      }
                      festMap.get(p.festivalId)!.proposals.push(p);
                    });

                    return Array.from(festMap.values()).map(({ festival, proposals: festProposals }) => {
                      const festKey = `${sc.id}-${festival.id}`;
                      const isFestOpen = expandedFestivals.has(festKey);

                      const fDone = festProposals.reduce(
                        (a, p) => a + p.implementations.filter((i) => i.status === "COMPLETED").length, 0
                      );
                      const fTotal = festProposals.reduce(
                        (a, p) => a + p.implementations.filter((i) => i.status !== "NOT_RELEVANT").length, 0
                      );
                      const fPct = fTotal > 0 ? Math.round((fDone / fTotal) * 100) : 0;
                      const festColor = festival.type === "NEW_YEAR" ? "text-blue-600" : "text-orange-500";
                      const festBg = festival.type === "NEW_YEAR" ? "bg-blue-50 hover:bg-blue-100" : "bg-orange-50 hover:bg-orange-100";
                      const festBar = festival.type === "NEW_YEAR" ? "bg-blue-400" : "bg-orange-400";

                      return (
                        <div key={festKey} className="border-t border-gray-100">
                          {/* Festival header */}
                          <button
                            onClick={() => toggleFestival(festKey)}
                            className={`w-full flex items-center justify-between px-6 py-3 transition-colors text-left ${festBg}`}
                          >
                            <div className="flex items-center gap-2">
                              {isFestOpen
                                ? <ChevronUp size={15} className={festColor} />
                                : <ChevronDown size={15} className="text-gray-400" />}
                              <span className={`text-sm font-semibold ${festColor}`}>
                                {FESTIVAL_TYPE_LABELS[festival.type]} {festival.year}
                              </span>
                              <span className="text-xs text-gray-400">{festProposals.length} ข้อ</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-bold ${festColor}`}>{fPct}%</span>
                              <span className="text-xs text-gray-400 ml-1">({fDone}/{fTotal})</span>
                            </div>
                          </button>

                          {/* Thin festival progress bar */}
                          <div className="h-0.5 bg-gray-100">
                            <div className={`h-full ${festBar} transition-all`} style={{ width: `${fPct}%` }} />
                          </div>

                          {/* Proposals under this festival */}
                          {isFestOpen && (
                            <div className="divide-y divide-gray-100">
                              {festProposals.map((proposal) => {
                                const allImpls = proposal.implementations;
                                const notRelevant = allImpls.filter((i) => i.status === "NOT_RELEVANT").length;
                                const relevant = allImpls.filter((i) => i.status !== "NOT_RELEVANT");
                                const done = relevant.filter((i) => i.status === "COMPLETED").length;
                                const inProg = relevant.filter((i) => i.status === "IN_PROGRESS").length;
                                const notAnswered = relevant.filter((i) => i.status === "NOT_STARTED").length;
                                const total = relevant.length;
                                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                                const proposalKey = `${sc.id}-${festival.id}-${proposal.id}`;

                                return (
                                  <div key={proposalKey}>
                                    <div
                                      className="px-8 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                      onClick={() =>
                                        setExpandedProposal(expandedProposal === proposalKey ? null : proposalKey)
                                      }
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-medium text-gray-400">ข้อ {proposal.orderNumber}</span>
                                          <p className="mt-0.5 font-medium text-gray-900">{proposal.title}</p>
                                          {proposal.description && (
                                            <p className="text-sm text-gray-500 mt-0.5">{proposal.description}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="text-right space-y-0.5">
                                            <p className="text-base font-bold text-gray-900">{pct}%</p>
                                            <p className="text-xs text-green-600">เสร็จ {done}/{total}</p>
                                            {inProg > 0 && <p className="text-xs text-yellow-600">กำลังทำ {inProg}</p>}
                                            {notAnswered > 0 && <p className="text-xs text-gray-400">ยังไม่ตอบ {notAnswered}</p>}
                                            {notRelevant > 0 && <p className="text-xs text-slate-400">ไม่เกี่ยวข้อง {notRelevant}</p>}
                                          </div>
                                          {expandedProposal === proposalKey
                                            ? <ChevronUp size={15} className="text-gray-400" />
                                            : <ChevronDown size={15} className="text-gray-400" />}
                                        </div>
                                      </div>
                                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-green-500 rounded-full transition-all"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>

                                    {expandedProposal === proposalKey && allImpls.length > 0 && (
                                      <div className="bg-gray-50 px-8 py-3 space-y-2">
                                        {allImpls.map((impl) => (
                                          <div
                                            key={impl.id}
                                            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100"
                                          >
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-800">{impl.agency.name}</p>
                                              {impl.content ? (
                                                <p className="text-sm text-gray-600 mt-0.5">{impl.content}</p>
                                              ) : (
                                                <p className="text-sm text-gray-400 italic mt-0.5">ยังไม่ได้กรอกข้อมูล</p>
                                              )}
                                            </div>
                                            <span
                                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[impl.status as keyof typeof STATUS_COLORS]}`}
                                            >
                                              {STATUS_LABELS[impl.status as keyof typeof STATUS_LABELS]}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Sub-committee Tab */}
      {activeTab === "subcommittees" && (() => {
        const proposalsBySC = new Map<string, Proposal[]>();
        filteredProposals.forEach((p) => {
          p.subCommittees.forEach(({ subCommittee }) => {
            if (!proposalsBySC.has(subCommittee.id))
              proposalsBySC.set(subCommittee.id, []);
            proposalsBySC.get(subCommittee.id)!.push(p);
          });
        });
        return (
          <div className="space-y-2">
            {data.subCommittees.map((sc) => {
              const proposals = proposalsBySC.get(sc.id) ?? [];
              const total = proposals.reduce((a, p) => a + p.implementations.filter(i => i.status !== "NOT_RELEVANT").length, 0);
              const done = proposals.reduce((a, p) => a + p.implementations.filter(i => i.status === "COMPLETED").length, 0);
              const inProg = proposals.reduce((a, p) => a + p.implementations.filter(i => i.status === "IN_PROGRESS").length, 0);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isOpen = expandedSCTab === sc.id;
              return (
                <div key={sc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                  <button
                    onClick={() => setExpandedSCTab(isOpen ? null : sc.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {isOpen ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{sc.name}</p>
                        <span className={`text-sm font-bold shrink-0 ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-gray-400"}`}>
                          {done}/{total} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-gray-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{proposals.length} ข้อเสนอ · กำลังทำ {inProg} · เสร็จ {done}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {proposals.map((p) => {
                        const pDone = p.implementations.filter(i => i.status === "COMPLETED").length;
                        const pTotal = p.implementations.filter(i => i.status !== "NOT_RELEVANT").length;
                        const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
                        return (
                          <div key={p.id} className="px-6 py-3 flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs text-gray-400 mr-1.5">ข้อ {p.orderNumber}</span>
                              <span className="text-sm text-gray-800">{p.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pPct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{pPct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Agencies Tab */}
      {activeTab === "agencies" && (
        <div className="space-y-2">
          {data.agencies.map((agency) => {
            const relevantImpls = agency.implementations.filter((i) =>
              selectedFestival === "all" ? true : i.proposal.festival.id === selectedFestival
            );
            const total = relevantImpls.filter((i) => i.status !== "NOT_RELEVANT").length;
            const done = relevantImpls.filter((i) => i.status === "COMPLETED").length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isOpen = expandedAgency === agency.id;

            return (
              <div key={agency.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div
                  className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedAgency(isOpen ? null : agency.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{agency.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-gray-400"}`}>
                            {done}/{total}
                          </span>
                          {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-gray-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isOpen && relevantImpls.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-3 space-y-2 bg-gray-50/50">
                    {relevantImpls.map((impl, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              impl.proposal.festival.type === "NEW_YEAR"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-orange-50 text-orange-600"
                            }`}>
                              {impl.proposal.festival.type === "NEW_YEAR" ? "🎆" : "💦"}{" "}
                              {FESTIVAL_TYPE_LABELS[impl.proposal.festival.type]} {impl.proposal.festival.year}
                            </span>
                          </div>
                          {impl.content ? (
                            <p className="text-sm text-gray-600">{impl.content}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">ยังไม่กรอกข้อมูล</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[impl.status]}`}>
                          {STATUS_LABELS[impl.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>

      <FAQSection />

      {data.siteConfig.site_footnote && (
        <footer className="border-t border-gray-100 py-5 text-center bg-white">
          <p className="text-xs text-gray-400 whitespace-pre-wrap max-w-3xl mx-auto px-4">{data.siteConfig.site_footnote}</p>
        </footer>
      )}
    </div>
  );
}
