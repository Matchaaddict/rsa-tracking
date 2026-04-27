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
import { STATUS_LABELS, STATUS_COLORS, FESTIVAL_TYPE_LABELS, festIcon, festTheme } from "@/lib/utils";
import {
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
  Download,
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
  updatedAt: string;
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
  expectedAgencyIds: string[];
}

interface AgencyData {
  id: string;
  name: string;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: { status: string; content: string | null; updatedAt: string; proposal: { festival: Festival } }[];
}

interface DashboardData {
  festivals: Festival[];
  proposals: Proposal[];
  agencies: AgencyData[];
  subCommittees: SubCommittee[];
  siteConfig: Record<string, string>;
}

// ดูสูตรเต็มได้ที่ docs/PROGRESS_CALCULATION.md
function computeProgress(proposals: Proposal[]) {
  let expected = 0;
  let notRelevant = 0;
  let completed = 0;
  let inProgress = 0;
  let started = 0; // implementation rows with NOT_STARTED status (acknowledged but no action)

  proposals.forEach((p) => {
    expected += p.expectedAgencyIds.length;
    p.implementations.forEach((i) => {
      if (i.status === "NOT_RELEVANT") notRelevant++;
      else if (i.status === "COMPLETED") completed++;
      else if (i.status === "IN_PROGRESS") inProgress++;
      else if (i.status === "NOT_STARTED") started++;
    });
  });

  const total = Math.max(expected - notRelevant, 0);
  const notStarted = Math.max(total - completed - inProgress, 0);
  const active = completed + inProgress;
  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  void started;

  return { expected, notRelevant, completed, inProgress, notStarted, active, total, completedPct, activePct };
}

const PIE_COLORS = ["#22c55e", "#eab308", "#9ca3af"];

function DownloadMenu({ festivalId }: { festivalId: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  const qs = festivalId ? `&festivalId=${encodeURIComponent(festivalId)}` : "";
  const items = [
    { type: "detail", label: "รายละเอียดทั้งหมด", desc: "ทุกข้อ × ทุกหน่วยงาน รวมรายละเอียดล่าสุด" },
    { type: "summary", label: "สรุปรายหน่วยงาน", desc: "ความคืบหน้ารวมต่อหน่วยงาน" },
    { type: "pending", label: "หน่วยงานที่ยังไม่รายงาน", desc: "ใช้สำหรับติดตามทวงรายงาน" },
    { type: "history", label: "ประวัติการรายงาน", desc: "ทุก progress entry พร้อมผู้รายงาน" },
  ];

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-all"
      >
        <Download size={14} /> ดาวน์โหลด CSV
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {items.map((it) => (
            <a
              key={it.type}
              href={`/api/public/export?type=${it.type}${qs}`}
              download
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="text-sm font-medium text-gray-800">{it.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{it.desc}</div>
            </a>
          ))}
          <div className="bg-gray-50 px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">
            {festivalId ? "เฉพาะวาระที่กรองอยู่" : "รวมทุกวาระ"} · เปิดด้วย Excel ได้เลย (UTF-8 BOM)
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSC, setSelectedSC] = useState<string | null>(null);

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

  const overall = computeProgress(filteredProposals);

  const agenciesWithDataForFilter = new Set(
    filteredProposals.flatMap((p) =>
      p.implementations
        .filter((i) => i.content && i.status !== "NOT_RELEVANT")
        .map((i) => i.agencyId)
    )
  ).size;

  const pieData = [
    { name: STATUS_LABELS.COMPLETED, value: overall.completed },
    { name: STATUS_LABELS.IN_PROGRESS, value: overall.inProgress },
    { name: STATUS_LABELS.NOT_STARTED, value: overall.notStarted },
  ].filter((d) => d.value > 0);

  const proposalBarData = filteredProposals.map((p) => {
    const s = computeProgress([p]);
    return {
      name: `ข้อ ${p.orderNumber}`,
      label: p.title.slice(0, 20) + (p.title.length > 20 ? "…" : ""),
      completed: s.completed,
      inProgress: s.inProgress,
      notStarted: s.notStarted,
    };
  });

  // เปรียบเทียบรายวาระ — โชว์เมื่อ selectedFestival === "all"
  const festivalBarData = data.festivals.map((f) => {
    const s = computeProgress(data.proposals.filter((p) => p.festivalId === f.id));
    return {
      name: `${festIcon(f.type)} ${FESTIVAL_TYPE_LABELS[f.type]} ${f.year}`,
      completed: s.completed,
      inProgress: s.inProgress,
      notStarted: s.notStarted,
    };
  });

  const ringR = 52;
  const ringCirc = 2 * Math.PI * ringR;
  const ringActive = (overall.activePct / 100) * ringCirc;
  const ringDone = (overall.completedPct / 100) * ringCirc;

  return (
    <div className="min-h-screen bg-gray-50">
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2460] via-[#1a3a8a] to-[#1e3a8a] rounded-3xl text-white shadow-2xl">

        <div className="relative px-6 pt-7 pb-6 space-y-5">
          {/* Title row */}
          <div className="flex items-center gap-4">
            {/* Completion Ring: yellow = ดำเนินการแล้ว (active), green = เสร็จสมบูรณ์ overlays */}
            <svg width={88} height={88} viewBox="0 0 130 130" className="shrink-0">
              <circle cx={65} cy={65} r={ringR} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={12} />
              <circle cx={65} cy={65} r={ringR} fill="none"
                stroke="#fbbf24" strokeWidth={12}
                strokeDasharray={`${ringActive} ${ringCirc}`}
                strokeLinecap="round"
                transform="rotate(-90 65 65)"
              />
              <circle cx={65} cy={65} r={ringR} fill="none"
                stroke="#34d399" strokeWidth={12}
                strokeDasharray={`${ringDone} ${ringCirc}`}
                strokeLinecap="round"
                transform="rotate(-90 65 65)"
              />
              <text x={65} y={58} textAnchor="middle" fill="white" style={{ fontSize: 24, fontWeight: 700 }}>{overall.activePct}%</text>
              <text x={65} y={74} textAnchor="middle" fill="rgba(255,255,255,0.7)" style={{ fontSize: 9 }}>ดำเนินการแล้ว</text>
              <text x={65} y={88} textAnchor="middle" fill="#a7f3d0" style={{ fontSize: 10, fontWeight: 600 }}>เสร็จ {overall.completedPct}%</text>
            </svg>
            <div>
              <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase">{data.siteConfig.hero_label ?? "RSAT"}</p>
              <h1 className="text-lg sm:text-2xl font-bold leading-snug mt-0.5">
                {data.siteConfig.hero_title ?? "ระบบติดตามข้อเสนอแนวทางป้องกันและลดอุบัติเหตุทางถนน"}
              </h1>
              <p className="text-blue-200 text-sm mt-1">{data.siteConfig.hero_subtitle ?? "ในช่วงการรณรงค์เทศกาล ฯ"}</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "หน่วยงานที่กรอก", value: agenciesWithDataForFilter, icon: "🏢", color: "from-white/10 to-white/5" },
              { label: "ข้อเสนอทั้งหมด", value: filteredProposals.length, icon: "📋", color: "from-white/10 to-white/5" },
              { label: "เสร็จสมบูรณ์", value: overall.completed, icon: "✅", color: "from-emerald-500/20 to-emerald-600/10" },
              { label: "กำลังดำเนินการ", value: overall.inProgress, icon: "⚡", color: "from-amber-500/20 to-amber-600/10" },
            ].map((s) => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl px-3 py-2.5 border border-white/10`}>
                <div className="text-xl mb-0.5">{s.icon}</div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-blue-200 text-xs leading-tight mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-committee Progress */}
      {(() => {
        const scProposals = new Map<string, Proposal[]>();
        filteredProposals.forEach((p) => {
          p.subCommittees.forEach(({ subCommittee }) => {
            if (!scProposals.has(subCommittee.id)) scProposals.set(subCommittee.id, []);
            scProposals.get(subCommittee.id)!.push(p);
          });
        });
        const rows = data.subCommittees
          .map((sc) => {
            const s = computeProgress(scProposals.get(sc.id) ?? []);
            return {
              name: sc.name.replace(/^C\d+:\s*/, ""),
              activePct: s.activePct,
              completedPct: s.completedPct,
              completed: s.completed,
              inProgress: s.inProgress,
              total: s.total,
            };
          })
          .sort((a, b) => b.activePct - a.activePct);
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-600 rounded-full" />
                <p className="text-sm font-semibold text-gray-700">ความคืบหน้าในการขับเคลื่อนรายอนุกรรมการ</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />เสร็จ</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />กำลังทำ</span>
              </div>
            </div>
            <div className="space-y-3">
              {rows.map((sc, idx) => (
                <div key={sc.name} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                    sc.completedPct >= 70 ? "bg-emerald-100 text-emerald-700" :
                    sc.activePct    >= 40 ? "bg-blue-100 text-blue-700" :
                    sc.activePct    >  0  ? "bg-amber-100 text-amber-700" :
                                            "bg-gray-100 text-gray-400"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="w-28 sm:w-44 shrink-0">
                    <p className="text-xs text-gray-600 leading-snug line-clamp-2">{sc.name}</p>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                        style={{ width: `${sc.completedPct}%` }}
                      />
                      <div
                        className="h-full bg-gradient-to-r from-amber-300 to-amber-400 transition-all duration-700"
                        style={{ width: `${Math.max(sc.activePct - sc.completedPct, 0)}%` }}
                      />
                    </div>
                    <span className="absolute right-2 top-0.5 text-xs font-bold text-gray-700">
                      {sc.activePct}%
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 shrink-0 w-14 text-right tabular-nums leading-tight">
                    <div className="text-emerald-600">เสร็จ {sc.completed}</div>
                    <div>{sc.completed + sc.inProgress}/{sc.total}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Festival Filter */}
      {(() => {
        const allPct = computeProgress(data.proposals).activePct;
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 font-medium mr-1">กรองตามวาระ:</span>
            <button
              onClick={() => setSelectedFestival("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedFestival === "all"
                  ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
              }`}
            >
              ทุกวาระ
              <span className={`ml-1.5 text-xs ${selectedFestival === "all" ? "text-gray-300" : "text-gray-400"}`}>
                {allPct}%
              </span>
            </button>
            {data.festivals.map((f) => {
              const pct = computeProgress(data.proposals.filter((p) => p.festivalId === f.id)).activePct;
              const isActive = selectedFestival === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFestival(f.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    isActive
                      ? `${festTheme(f.type).bgSolid} text-white shadow-sm`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
                  }`}
                >
                  {festIcon(f.type)} {FESTIVAL_TYPE_LABELS[f.type]} {f.year}
                  <span className={`ml-1.5 text-xs ${isActive ? "opacity-80" : "text-gray-400"}`}>
                    {pct}%
                  </span>
                </button>
              );
            })}
            <div className="ml-auto">
              <DownloadMenu festivalId={selectedFestival === "all" ? null : selectedFestival} />
            </div>
          </div>
        );
      })()}


      {/* Charts */}
      {overall.total > 0 && (() => {
        const showCompareChart = selectedFestival === "all" && data.festivals.length >= 2;
        const showPerProposalChart = selectedFestival !== "all" && proposalBarData.length > 0;
        const sideBar = showCompareChart || showPerProposalChart;
        return (
        <div className={`grid grid-cols-1 gap-4 ${sideBar ? "lg:grid-cols-2" : ""}`}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-1">สัดส่วนสถานะการดำเนินงาน</p>
            <p className="text-xs text-gray-400 mb-3">ทั้งหมด {overall.total} รายการ</p>
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

          {showPerProposalChart && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">ความคืบหน้ารายข้อเสนอ</p>
              <p className="text-xs text-gray-400 mb-3">จำนวนหน่วยงานต่อสถานะ</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={proposalBarData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={14}>
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

          {showCompareChart && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">เปรียบเทียบรายวาระ</p>
              <p className="text-xs text-gray-400 mb-3">จำนวนหน่วยงานต่อสถานะในแต่ละวาระ</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={festivalBarData}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                  barSize={24}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={120} />
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
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="completed" />
                  <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="inProgress" />
                  <Bar dataKey="notStarted" stackId="a" fill="#e5e7eb" name="notStarted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        );
      })()}

      {/* Tabs + Search */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {([
            { key: "proposals", label: "รายข้อเสนอ", count: filteredProposals.length },
            { key: "subcommittees", label: "รายอนุกรรมการ", count: data.subCommittees.length },
            { key: "agencies", label: "รายหน่วยงาน", count: data.agencies.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearchQuery(""); setSelectedSC(null); }}
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

        {activeTab === "proposals" && (
          <div className="space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาข้อเสนอ..."
                className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {data.subCommittees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedSC(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedSC === null
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  ทุกอนุกรรมการ
                </button>
                {data.subCommittees.map((sc) => {
                  const num = sc.name.match(/^C(\d+)/)?.[1];
                  const short = num ? `อนุฯ ${num}` : sc.name.slice(0, 4);
                  return (
                    <button
                      key={sc.id}
                      onClick={() => setSelectedSC(selectedSC === sc.id ? null : sc.id)}
                      title={sc.name}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        selectedSC === sc.id
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Proposals Tab */}
      {activeTab === "proposals" && (
        <div className="space-y-3">
          {(() => {
            const proposalsForTab = selectedSC
              ? filteredProposals.filter((p) => p.subCommittees.some((s) => s.subCommittee.id === selectedSC))
              : filteredProposals;
            const q = searchQuery.trim().toLowerCase();
            const results = q
              ? proposalsForTab.filter(
                  (p) =>
                    p.title.toLowerCase().includes(q) ||
                    (p.description ?? "").toLowerCase().includes(q)
                )
              : null;
            return results !== null ? (() => {
            if (results.length === 0) {
              return (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    ไม่พบข้อเสนอที่ตรงกับ &ldquo;{searchQuery}&rdquo;
                  </CardContent>
                </Card>
              );
            }
            return (
              <>
                <p className="text-xs text-gray-400">พบ {results.length} ข้อเสนอ</p>
                {results.map((proposal) => {
                  const allImpls = proposal.implementations;
                  const s = computeProgress([proposal]);
                  const { completed: done, inProgress: inProg, total, activePct: pct, completedPct } = s;
                  const isOpen = expandedProposal === `search-${proposal.id}`;
                  return (
                    <div key={proposal.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div
                        className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedProposal(isOpen ? null : `search-${proposal.id}`)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs text-gray-400">ข้อ {proposal.orderNumber}</span>
                              <Badge variant={festTheme(proposal.festival.type).badgeVariant}>
                                {festIcon(proposal.festival.type)} {FESTIVAL_TYPE_LABELS[proposal.festival.type]} {proposal.festival.year}
                              </Badge>
                              {proposal.subCommittees.map(({ subCommittee }) => {
                                const n = subCommittee.name.match(/^C(\d+)/)?.[1];
                                return <Badge key={subCommittee.id} variant="gray">{n ? `อนุฯ ${n}` : subCommittee.name}</Badge>;
                              })}
                            </div>
                            <p className="font-medium text-gray-900">{proposal.title}</p>
                            {proposal.description && (
                              <p className="text-sm text-gray-500 mt-0.5">{proposal.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-base font-bold text-gray-900">{pct}%</p>
                              <p className="text-xs text-green-600">เสร็จ {done}/{total}</p>
                              {inProg > 0 && <p className="text-xs text-yellow-600">กำลังทำ {inProg}</p>}
                            </div>
                            {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completedPct}%` }} />
                          <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(pct - completedPct, 0)}%` }} />
                        </div>
                      </div>
                      {isOpen && allImpls.length > 0 && (
                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 space-y-2">
                          {allImpls.map((impl) => (
                            <div key={impl.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">{impl.agency.name}</p>
                                {impl.content
                                  ? <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{impl.content}</p>
                                  : <p className="text-sm text-gray-400 italic mt-0.5">ยังไม่ได้กรอกข้อมูล</p>
                                }
                                {impl.content && (
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    อัปเดตล่าสุด: {new Date(impl.updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                  </p>
                                )}
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[impl.status as keyof typeof STATUS_COLORS]}`}>
                                {STATUS_LABELS[impl.status as keyof typeof STATUS_LABELS]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })() : proposalsForTab.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                ยังไม่มีข้อเสนอ
              </CardContent>
            </Card>
          ) : (() => {
            // Group proposals by sub-committee
            const scMap = new Map<string, { sc: SubCommittee; proposals: Proposal[] }>();
            proposalsForTab.forEach((p) => {
              p.subCommittees.forEach(({ subCommittee }) => {
                if (!scMap.has(subCommittee.id)) {
                  scMap.set(subCommittee.id, { sc: subCommittee, proposals: [] });
                }
                scMap.get(subCommittee.id)!.proposals.push(p);
              });
            });

            return Array.from(scMap.values()).map(({ sc, proposals }) => {
              // Aggregate stats for this SC group
              const scStats = computeProgress(proposals);
              const { completed: scDone, total: scTotal, activePct: scPct, completedPct: scDonePct } = scStats;
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
                        <p className="font-semibold text-gray-900">{sc.name.replace(/^C(\d+):/, (_, n) => `อนุฯ ${n}:`)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{proposals.length} ข้อเสนอ</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-blue-600">{scPct}%</p>
                      <p className="text-xs text-gray-400">เสร็จ {scDone}/{scTotal}</p>
                    </div>
                  </button>

                  {/* SC Progress bar (stacked) */}
                  <div className="h-1 bg-gray-100 flex">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${scDonePct}%` }} />
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(scPct - scDonePct, 0)}%` }} />
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

                      const fStats = computeProgress(festProposals);
                      const { completed: fDone, total: fTotal, activePct: fPct, completedPct: fDonePct } = fStats;
                      const festColor = festTheme(festival.type).text;
                      const festBg = festTheme(festival.type).bgSoft;

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

                          {/* Thin festival progress bar (stacked) */}
                          <div className="h-0.5 bg-gray-100 flex">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${fDonePct}%` }} />
                            <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(fPct - fDonePct, 0)}%` }} />
                          </div>

                          {/* Proposals under this festival */}
                          {isFestOpen && (
                            <div className="divide-y divide-gray-100">
                              {festProposals.map((proposal) => {
                                const allImpls = proposal.implementations;
                                const ps = computeProgress([proposal]);
                                const { completed: done, inProgress: inProg, notRelevant, notStarted: notAnswered, total, activePct: pct, completedPct: donePct } = ps;
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
                                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${donePct}%` }} />
                                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(pct - donePct, 0)}%` }} />
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
                                                <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{impl.content}</p>
                                              ) : (
                                                <p className="text-sm text-gray-400 italic mt-0.5">ยังไม่ได้กรอกข้อมูล</p>
                                              )}
                                              {impl.content && (
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                  อัปเดตล่าสุด: {new Date(impl.updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
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
          })()})()}
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
              const s = computeProgress(proposals);
              const { completed: done, inProgress: inProg, total, activePct: pct, completedPct: donePct } = s;
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
                        <p className="font-semibold text-gray-900 text-sm">{sc.name.replace(/^C(\d+):/, (_, n) => `อนุฯ ${n}:`)}</p>
                        <span className={`text-sm font-bold shrink-0 ${donePct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-gray-400"}`}>
                          {done}/{total} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${donePct}%` }} />
                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(pct - donePct, 0)}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{proposals.length} ข้อเสนอ · กำลังทำ {inProg} · เสร็จ {done}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {proposals.map((p) => {
                        const ps = computeProgress([p]);
                        const { activePct: pPct, completedPct: pDonePct } = ps;
                        return (
                          <div key={p.id} className="px-6 py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${festTheme(p.festival.type).badge}`}>
                                  {festIcon(p.festival.type)} {FESTIVAL_TYPE_LABELS[p.festival.type]} {p.festival.year}
                                </span>
                                <span className="text-xs text-gray-400">ข้อ {p.orderNumber}</span>
                              </div>
                              <p className="text-sm text-gray-800 mt-0.5">{p.title}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${pDonePct}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${Math.max(pPct - pDonePct, 0)}%` }} />
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
            // Proposals this agency is expected to respond to (within filter)
            const expectedProposals = filteredProposals.filter((p) =>
              p.expectedAgencyIds.includes(agency.id)
            );
            const expected = expectedProposals.length;
            const notRelevant = relevantImpls.filter((i) => i.status === "NOT_RELEVANT").length;
            const done = relevantImpls.filter((i) => i.status === "COMPLETED").length;
            const inProg = relevantImpls.filter((i) => i.status === "IN_PROGRESS").length;
            const total = Math.max(expected - notRelevant, 0);
            const pct = total > 0 ? Math.round(((done + inProg) / total) * 100) : 0;
            const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
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
                          <span className={`text-sm font-bold ${donePct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-gray-400"}`}>
                            {done}/{total} ({pct}%)
                          </span>
                          {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${donePct}%` }} />
                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(pct - donePct, 0)}%` }} />
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
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${festTheme(impl.proposal.festival.type).badge}`}>
                              {festIcon(impl.proposal.festival.type)}{" "}
                              {FESTIVAL_TYPE_LABELS[impl.proposal.festival.type]} {impl.proposal.festival.year}
                            </span>
                          </div>
                          {impl.content ? (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{impl.content}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">ยังไม่กรอกข้อมูล</p>
                          )}
                          {impl.content && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              อัปเดตล่าสุด: {new Date(impl.updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
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
