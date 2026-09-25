"use client";

import { Fragment, useEffect, useRef, useState } from "react";
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
  CartesianGrid,
} from "recharts";
import { STATUS_LABELS, STATUS_COLORS, festIcon, festTheme, cn } from "@/lib/utils";
import {
  KIND_META,
  SOURCE_KINDS,
  computeProgress,
  isOverdue,
  itemStatus,
  sourceKind,
  sourceLabel,
  type ItemStatus,
  type SourceKind,
} from "@/lib/tracking";
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
  FileText,
  Files,
  ArrowUp,
  TriangleAlert,
  TrafficCone,
  Construction,
  Trees,
  CalendarDays,
  Download,
  Landmark,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { FAQSection } from "./FAQSection";
import { HeroBanner } from "./HeroBanner";
import { SEARCH_EVENT, FOCUS_SEARCH_EVENT } from "./AppShell";

interface Festival {
  id: string;
  name: string;
  type: string;
  year: number;
  meetingNo?: string | null;
  date?: string | null;
  docUrl?: string | null;
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
  dueDate: string | null;
  createdAt: string;
  tags: { tag: { id: string; name: string } }[];
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

type TabKey = "proposals" | "agencies" | "subcommittees";
const TAB_KEYS: TabKey[] = ["proposals", "subcommittees", "agencies"];

const proposalStatus = itemStatus;
type ProposalStatus = ItemStatus;

const STATUS_PILL: Record<ProposalStatus, { cls: string; dot: string }> = {
  COMPLETED: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  IN_PROGRESS: { cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  NOT_STARTED: { cls: "bg-red-50 text-red-600 ring-red-200", dot: "bg-red-500" },
  NOT_RELEVANT: { cls: "bg-slate-50 text-slate-500 ring-slate-200", dot: "bg-slate-400" },
};

// คำเรียกรายการตามประเภทที่มา
const KIND_NOUN: Record<SourceKind, string> = {
  FESTIVAL: "ข้อเสนอ",
  MEETING: "มติ",
  PROJECT: "ภารกิจ",
  CABINET: "มติ",
};

const C_DONE = "#22c55e";
const C_PROG = "#f59e0b";
const C_NONE = "#94a3b8";
const PAGE_SIZE = 15;

const thDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

const scShort = (name: string) => {
  const n = name.match(/^C(\d+)/)?.[1];
  return n ? `อนุฯ ${n}` : name.slice(0, 8);
};

const tooltipStyle = { borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 13 };
const seriesLabels: Record<string, string> = {
  completed: STATUS_LABELS.COMPLETED,
  inProgress: STATUS_LABELS.IN_PROGRESS,
  notStarted: STATUS_LABELS.NOT_STARTED,
};

// Shows agencies expected for a proposal that have NOT created any
// implementation row yet (silently absent). Agencies with a row get
// rendered in the regular implementation list, even if NOT_STARTED.
function PendingAgenciesList({
  proposal,
  agencies,
}: {
  proposal: Proposal;
  agencies: AgencyData[];
}) {
  const implAgencyIds = new Set(proposal.implementations.map((i) => i.agencyId));
  const pending = agencies.filter(
    (a) => proposal.expectedAgencyIds.includes(a.id) && !implAgencyIds.has(a.id)
  );
  if (pending.length === 0) return null;
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
      <p className="text-xs font-medium text-amber-700 mb-1.5 flex items-center gap-1.5">
        <Clock size={12} /> ยังไม่รายงาน ({pending.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {pending.map((a) => (
          <span
            key={a.id}
            className="text-xs bg-white border border-amber-200 rounded-full px-2.5 py-0.5 text-amber-800"
          >
            {a.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProposalDetail({ proposal, agencies }: { proposal: Proposal; agencies: AgencyData[] }) {
  return (
    <div className="space-y-2">
      {proposal.description && <p className="break-words text-sm text-slate-600">{proposal.description}</p>}
      {proposal.subCommittees.length > 0 && (
        <p className="text-xs text-slate-500">
          อนุกรรมการ:{" "}
          {proposal.subCommittees.map(({ subCommittee }) => subCommittee.name.replace(/^C(\d+):\s*/, "อนุฯ $1 ")).join(", ")}
        </p>
      )}
      {proposal.implementations.map((impl) => (
        <div key={impl.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800">{impl.agency.name}</p>
            {impl.content ? (
              <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap break-words">{impl.content}</p>
            ) : (
              <p className="text-sm text-slate-400 italic mt-0.5">ยังไม่ได้กรอกข้อมูล</p>
            )}
            {impl.content && (
              <p className="text-[10px] text-slate-400 mt-1">อัปเดตล่าสุด: {thDate(impl.updatedAt)}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[impl.status]}`}
          >
            {STATUS_LABELS[impl.status]}
          </span>
        </div>
      ))}
      <PendingAgenciesList proposal={proposal} agencies={agencies} />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
  pct,
  extra,
  art,
}: {
  title: string;
  value: number;
  icon: typeof FileText;
  tone: "blue" | "green" | "amber" | "red";
  pct?: number;
  extra?: React.ReactNode;
  art: React.ReactNode;
}) {
  const t = {
    blue: { card: "from-white to-blue-50/60", icon: "bg-blue-100 text-blue-600", title: "text-slate-700", bar: "bg-blue-500", pct: "text-slate-500" },
    green: { card: "from-emerald-50 to-white", icon: "bg-emerald-500 text-white", title: "text-slate-700", bar: "bg-emerald-500", pct: "text-slate-500" },
    amber: { card: "from-amber-50 to-orange-50/40", icon: "bg-amber-400 text-white", title: "text-amber-700", bar: "bg-amber-400", pct: "text-amber-600" },
    red: { card: "from-red-50 to-rose-50/40", icon: "bg-red-500 text-white", title: "text-red-700", bar: "bg-red-500", pct: "text-red-600" },
  }[tone];
  return (
    <div className={`@container relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br ${t.card} p-3.5 shadow-sm sm:p-5`}>
      <div className="pointer-events-none absolute -right-2 -top-1 hidden text-slate-300/70 opacity-80 @[19rem]:block">{art}</div>
      <div className="relative flex flex-col gap-2.5 @[13rem]:flex-row @[13rem]:items-start @[13rem]:gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl @[13rem]:h-12 @[13rem]:w-12 ${t.icon}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-semibold leading-snug @[13rem]:text-sm ${t.title}`}>{title}</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-2xl font-bold tabular-nums text-slate-900 @[13rem]:text-3xl">{value.toLocaleString()}</p>
            {extra}
          </div>
          {pct !== undefined && (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-100">
                <div className={`h-full rounded-full ${t.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-xs font-semibold tabular-nums ${t.pct}`}>{pct}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-100 bg-white p-5 shadow-sm", className)}>{children}</div>;
}

export function PublicDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKind, setSelectedKind] = useState<SourceKind>("FESTIVAL");
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("proposals");
  const [expandedSCTab, setExpandedSCTab] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSC, setSelectedSC] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [page, setPage] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/public/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
        // เปิดมาจากลิงก์ /?q=...#proposals (ค้นหาจาก header ของหน้าอื่น)
        const q = new URLSearchParams(window.location.search).get("q");
        if (q) setSearchQuery(q);
        const h = window.location.hash.slice(1) as TabKey;
        if (TAB_KEYS.includes(h)) {
          setActiveTab(h);
          setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }
      });
  }, []);

  // ลิงก์จาก sidebar (#proposals / #subcommittees / #agencies) และช่องค้นหาบน header
  useEffect(() => {
    const goToHash = () => {
      const h = window.location.hash.slice(1) as TabKey;
      if (TAB_KEYS.includes(h)) {
        setActiveTab(h);
        requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    };
    const onSearch = (e: Event) => {
      setActiveTab("proposals");
      setSearchQuery((e as CustomEvent<string>).detail ?? "");
      setPage(0);
    };
    const onFocusSearch = () => {
      setActiveTab("proposals");
      requestAnimationFrame(() => {
        tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        searchRef.current?.focus({ preventScroll: true });
      });
    };
    window.addEventListener("hashchange", goToHash);
    window.addEventListener(SEARCH_EVENT, onSearch);
    window.addEventListener(FOCUS_SEARCH_EVENT, onFocusSearch);
    return () => {
      window.removeEventListener("hashchange", goToHash);
      window.removeEventListener(SEARCH_EVENT, onSearch);
      window.removeEventListener(FOCUS_SEARCH_EVENT, onFocusSearch);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  if (!data) return null;

  // % แยกตามประเภทที่มาเสมอ — ไม่รวมเทศกาลกับการประชุมเป็นตัวเลขเดียว
  const kinds = SOURCE_KINDS.filter((k) => data.festivals.some((f) => sourceKind(f.type) === k));
  const kind: SourceKind = kinds.includes(selectedKind) ? selectedKind : kinds[0] ?? "FESTIVAL";
  const noun = KIND_NOUN[kind];
  const kindFestivals = data.festivals.filter((f) => sourceKind(f.type) === kind);
  const kindProposals = data.proposals.filter((p) => sourceKind(p.festival.type) === kind);
  const festivalId = kindFestivals.some((f) => f.id === selectedFestival) ? selectedFestival : "all";

  const filteredProposals =
    festivalId === "all" ? kindProposals : kindProposals.filter((p) => p.festivalId === festivalId);

  const overall = computeProgress(filteredProposals);

  const statusOf = new Map(filteredProposals.map((p) => [p.id, proposalStatus(p)]));
  const nProposals = filteredProposals.length;
  // การ์ดสถานะนับเป็นรายการ (หน่วยงาน × ข้อเสนอ) ให้ตรงกับหน้ารายงานและกราฟโดนัท
  const nDone = overall.completed;
  const nProg = overall.inProgress;
  const nNone = overall.notStarted;
  const pctOf = (n: number) => (overall.total > 0 ? Math.round((n / overall.total) * 100) : 0);
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const newThisMonth = filteredProposals.filter((p) => new Date(p.createdAt).getTime() >= monthAgo).length;

  const pieData = [
    { key: "completed", name: STATUS_LABELS.COMPLETED, value: overall.completed, color: C_DONE },
    { key: "inProgress", name: STATUS_LABELS.IN_PROGRESS, value: overall.inProgress, color: C_PROG },
    { key: "notStarted", name: STATUS_LABELS.NOT_STARTED, value: overall.notStarted, color: C_NONE },
  ];
  const piePct = (v: number) => (overall.total > 0 ? ((v / overall.total) * 100).toFixed(1) : "0.0");

  const proposalBarData = filteredProposals.map((p) => {
    const s = computeProgress([p]);
    return { name: `ข้อ ${p.orderNumber}`, completed: s.completed, inProgress: s.inProgress, notStarted: s.notStarted };
  });

  // เปรียบเทียบที่มาในประเภทเดียวกัน (ล่าสุด 8 รายการ)
  const festivalBarData = kindFestivals.slice(0, 8).map((f) => {
    const s = computeProgress(kindProposals.filter((p) => p.festivalId === f.id));
    return {
      name: `${sourceLabel(f)}`,
      completed: s.completed,
      inProgress: s.inProgress,
      notStarted: s.notStarted,
    };
  });
  const showCompare = festivalId === "all" && kindFestivals.length > 1;

  const latestUpdate = filteredProposals
    .flatMap((p) => p.implementations.map((i) => i.updatedAt))
    .sort()
    .at(-1);

  const ringR = 52;
  const ringCirc = 2 * Math.PI * ringR;
  const ringActive = (overall.activePct / 100) * ringCirc;
  const ringDone = (overall.completedPct / 100) * ringCirc;

  // ---- ตารางข้อเสนอ ----
  const q = searchQuery.trim().toLowerCase();
  const tableRows = filteredProposals.filter((p) => {
    if (selectedSC && !p.subCommittees.some((s) => s.subCommittee.id === selectedSC)) return false;
    if (statusFilter !== "all" && statusOf.get(p.id) !== statusFilter) return false;
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q) ||
      `${sourceLabel(p.festival)}`.includes(q) ||
      p.subCommittees.some((s) => s.subCommittee.name.toLowerCase().includes(q)) ||
      p.tags.some((t) => t.tag.name.toLowerCase().includes(q.replace(/^#/, ""))) ||
      p.implementations.some((i) => i.agency.name.toLowerCase().includes(q))
    );
  });
  const pageCount = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount - 1);
  const pageRows = tableRows.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);
  const agencyName = new Map(data.agencies.map((a) => [a.id, a.name]));

  const selectCls =
    "appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <div>
    <div className="space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-5 lg:px-8">
      <HeroBanner
        label={data.siteConfig.hero_label || "RSAT"}
        title={data.siteConfig.banner_title || "ขับเคลื่อนความปลอดภัยทางถนน สู่สังคมไทยที่ยั่งยืน"}
        tagline={data.siteConfig.banner_tagline || "ติดตาม · เร่งรัด · บูรณาการ · ลดอุบัติเหตุ · เพื่อชีวิตที่ปลอดภัยกว่า"}
      />

      {/* ตัวกรอง 2 ชั้น: ประเภทที่มา → ที่มา */}
      <div className="space-y-2.5">
        {kinds.length > 1 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm text-slate-500">ประเภท:</span>
            <div className="no-scrollbar -mx-3 flex min-w-0 basis-full gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:basis-0 sm:flex-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {kinds.map((k) => {
                const pct = computeProgress(data.proposals.filter((p) => sourceKind(p.festival.type) === k)).activePct;
                const active = k === kind;
                return (
                  <button
                    key={k}
                    onClick={() => { setSelectedKind(k); setSelectedFestival("all"); setSelectedSC(null); setPage(0); }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-1.5 text-[13px] font-semibold transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                      active
                        ? "border-[#0b1d4d] bg-[#0b1d4d] text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-400"
                    )}
                  >
                    <span aria-hidden>{KIND_META[k].icon}</span>
                    {KIND_META[k].label}
                    <span className={cn("text-xs font-medium", active ? "text-blue-200" : "text-slate-400")}>{pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm text-slate-500">{kind === "FESTIVAL" ? "วาระ:" : "ที่มา:"}</span>
          {kindFestivals.length <= 6 ? (
            <div className="no-scrollbar -mx-3 flex min-w-0 basis-full gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:basis-0 sm:flex-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {[{ id: "all", label: `ทุก${kind === "FESTIVAL" ? "วาระ" : KIND_META[kind].label}`, icon: "✅", type: "" }, ...kindFestivals.map((f) => ({
                id: f.id,
                label: sourceLabel(f),
                icon: festIcon(f.type),
                type: f.type,
              }))].map((f) => {
                const pct = computeProgress(
                  f.id === "all" ? kindProposals : kindProposals.filter((p) => p.festivalId === f.id)
                ).activePct;
                const active = festivalId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFestival(f.id); setPage(0); }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25"
                        : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300"
                    )}
                  >
                    <span aria-hidden>{f.icon}</span>
                    {f.label}
                    <span className={cn("text-xs font-medium", active ? "text-blue-100" : "text-slate-400")}>{pct}%</span>
                  </button>
                );
              })}
            </div>
          ) : (
            // ที่มาเยอะ (เช่น ประชุมหลายครั้ง) ใช้ dropdown แทนปุ่ม ไม่ให้ล้นจอ
            <div className="relative min-w-0 basis-full sm:basis-auto">
              <select
                value={festivalId}
                onChange={(e) => { setSelectedFestival(e.target.value); setPage(0); }}
                className="w-full appearance-none rounded-full border border-slate-200 bg-white py-2 pl-4 pr-9 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 sm:w-auto sm:min-w-[18rem]"
              >
                <option value="all">ทุก{KIND_META[kind].label} ({computeProgress(kindProposals).activePct}%)</option>
                {kindFestivals.map((f) => (
                  <option key={f.id} value={f.id}>
                    {sourceLabel(f)} ({computeProgress(kindProposals.filter((p) => p.festivalId === f.id)).activePct}%)
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        {latestUpdate && (
          <div className="flex items-center gap-2 text-xs text-slate-500 sm:ml-auto sm:gap-3 sm:rounded-xl sm:border sm:border-slate-200 sm:bg-white sm:px-4 sm:py-2 sm:shadow-sm">
            <CalendarDays size={18} className="shrink-0 text-slate-500 sm:text-slate-600" />
            <div className="flex gap-1 whitespace-nowrap sm:block sm:leading-tight">
              <p className="sm:text-[11px]">อัปเดตข้อมูลล่าสุด</p>
              <p className="font-medium text-slate-700 sm:text-sm">{thDate(latestUpdate)}</p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title={`${noun}ทั้งหมด`}
          value={nProposals}
          icon={FileText}
          tone="blue"
          art={<Files size={92} strokeWidth={1} />}
          extra={
            newThisMonth > 0 ? (
              <span className="mb-1 text-xs leading-tight text-slate-500">
                <span className="flex items-center gap-0.5 font-semibold text-emerald-600">
                  <ArrowUp size={14} /> +{newThisMonth}
                </span>
                ใน 30 วันล่าสุด
              </span>
            ) : undefined
          }
        />
        <StatCard title="ดำเนินการแล้ว" value={nDone} icon={CheckCircle2} tone="green" pct={pctOf(nDone)} art={<Trees size={88} strokeWidth={1} className="text-emerald-300/60" />} />
        <StatCard title="กำลังดำเนินการ" value={nProg} icon={Clock} tone="amber" pct={pctOf(nProg)} art={<TrafficCone size={88} strokeWidth={1} className="text-orange-300/70" />} />
        <StatCard title="ยังไม่ดำเนินการ" value={nNone} icon={TriangleAlert} tone="red" pct={pctOf(nNone)} art={<Construction size={88} strokeWidth={1} className="text-red-300/70" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-[1.15fr_1.2fr_0.75fr]">
        <Panel>
          <p className="text-[15px] font-bold text-slate-800 sm:text-base">สัดส่วนสถานะการดำเนินงาน</p>
          <p className="text-xs text-slate-500">ทั้งหมด {overall.total.toLocaleString()} รายการ (หน่วยงาน × ข้อเสนอ)</p>
          <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overall.total > 0 ? pieData : [{ key: "empty", name: "", value: 1, color: "#e2e8f0" }]}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={88}
                    startAngle={90}
                    endAngle={-270}
                    stroke="#fff"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {(overall.total > 0 ? pieData : [{ color: "#e2e8f0" }]).map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  {overall.total > 0 && <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} รายการ`]} />}
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{overall.total.toLocaleString()}</span>
                <span className="text-xs text-slate-500">รายการ</span>
              </div>
            </div>
            <ul className="w-full space-y-3 text-sm">
              {pieData.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-slate-700">
                    {d.value.toLocaleString()} <span className="text-slate-400">({piePct(d.value)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-800">{showCompare ? (kind === "FESTIVAL" ? "เปรียบเทียบรายวาระ" : `เปรียบเทียบราย${KIND_META[kind].label}`) : `ความคืบหน้าราย${noun}`}</p>
              <p className="text-xs text-slate-500">
                {showCompare ? "จำนวนหน่วยงานต่อสถานะในแต่ละที่มา" : `จำนวนหน่วยงานต่อสถานะในแต่ละ${noun}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              {pieData.map((d) => (
                <span key={d.key} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={showCompare ? festivalBarData : proposalBarData}
                margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                barGap={4}
                barCategoryGap={showCompare ? "22%" : "18%"}
              >
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: 11, fill: "#334155" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(15,23,42,0.04)" }}
                  formatter={(value, name) => [`${value} หน่วยงาน`, seriesLabels[name as string] || name]}
                />
                {showCompare ? (
                  <>
                    <Bar dataKey="completed" fill={C_DONE} radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="inProgress" fill={C_PROG} radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="notStarted" fill={C_NONE} radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="completed" stackId="a" fill={C_DONE} maxBarSize={22} />
                    <Bar dataKey="inProgress" stackId="a" fill={C_PROG} maxBarSize={22} />
                    <Bar dataKey="notStarted" stackId="a" fill={C_NONE} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="relative overflow-hidden lg:col-span-2 2xl:col-span-1">
          <p className="font-bold text-slate-800">ความคืบหน้ารวม</p>
          <div className="flex flex-col items-center sm:flex-row sm:justify-around 2xl:flex-col">
            <svg width={150} height={150} viewBox="0 0 130 130" className="shrink-0">
              <circle cx={65} cy={65} r={ringR} fill="none" stroke="#eef2f7" strokeWidth={10} />
              <circle cx={65} cy={65} r={ringR} fill="none" stroke={C_PROG} strokeWidth={10}
                strokeDasharray={`${ringActive} ${ringCirc}`} strokeLinecap="round" transform="rotate(-90 65 65)" />
              <circle cx={65} cy={65} r={ringR} fill="none" stroke={C_DONE} strokeWidth={10}
                strokeDasharray={`${ringDone} ${ringCirc}`} strokeLinecap="round" transform="rotate(-90 65 65)" />
              <text x={65} y={70} textAnchor="middle" fill="#0f172a" style={{ fontSize: 26, fontWeight: 700 }}>
                {overall.activePct}%
              </text>
              <text x={65} y={88} textAnchor="middle" fill="#16a34a" style={{ fontSize: 10, fontWeight: 600 }}>
                เสร็จ {overall.completedPct}%
              </text>
            </svg>
            <div className="text-center">
              <p className="font-semibold text-slate-800">มีการดำเนินการแล้ว</p>
              <p className="text-xs text-slate-500">
                {overall.active.toLocaleString()} จากทั้งหมด {overall.total.toLocaleString()} รายการ
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-center gap-2">
              <Landmark size={22} className="text-blue-600" />
              <div className="leading-tight">
                <p className="text-lg font-bold text-slate-800">{data.subCommittees.length}</p>
                <p className="text-[11px] text-slate-500">อนุกรรมการ</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <UsersRound size={22} className="text-blue-600" />
              <div className="leading-tight">
                <p className="text-lg font-bold text-slate-800">{data.agencies.length}</p>
                <p className="text-[11px] text-slate-500">หน่วยงานที่เกี่ยวข้อง</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Tabs */}
      <div ref={tabsRef} className="scroll-mt-20 space-y-3">
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {([
            { key: "proposals", label: `รายละเอียด${noun}`, short: noun, count: filteredProposals.length },
            { key: "subcommittees", label: "รายอนุกรรมการ", short: "อนุกรรมการ", count: data.subCommittees.length },
            { key: "agencies", label: "รายหน่วยงาน", short: "หน่วยงาน", count: data.agencies.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSelectedSC(null); setPage(0); }}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-5",
                activeTab === t.key
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300"
              )}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  activeTab === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

      {/* Proposals table */}
      {activeTab === "proposals" && (
        <Panel className="p-0 sm:p-0">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="ค้นหาข้อเสนอ หน่วยงาน วาระ"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="ล้างคำค้นหา"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="relative">
                <select value={festivalId} onChange={(e) => { setSelectedFestival(e.target.value); setPage(0); }} className={cn(selectCls, "w-full")}>
                  <option value="all">ทุก{kind === "FESTIVAL" ? "วาระ" : "ที่มา"}</option>
                  {kindFestivals.map((f) => (
                    <option key={f.id} value={f.id}>{sourceLabel(f)}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as ProposalStatus | "all"); setPage(0); }} className={cn(selectCls, "w-full")}>
                  <option value="all">ทุกสถานะ</option>
                  <option value="COMPLETED">{STATUS_LABELS.COMPLETED}</option>
                  <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                  <option value="NOT_STARTED">{STATUS_LABELS.NOT_STARTED}</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select value={selectedSC ?? ""} onChange={(e) => { setSelectedSC(e.target.value || null); setPage(0); }} className={cn(selectCls, "w-full")}>
                  <option value="">ทุกอนุกรรมการ</option>
                  {data.subCommittees.map((sc) => (
                    <option key={sc.id} value={sc.id}>{scShort(sc.name)}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <a
                href={`/api/public/export?type=detail&kind=${kind}${festivalId !== "all" ? `&festivalId=${festivalId}` : ""}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Download size={16} /> ดาวน์โหลด
              </a>
            </div>
          </div>

          {/* มือถือ: การ์ด */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {pageRows.length === 0 && (
              <li className="py-12 text-center text-sm text-slate-400">
                {q ? <>ไม่พบรายการที่ตรงกับ &ldquo;{searchQuery}&rdquo;</> : `ยังไม่มี${noun}`}
              </li>
            )}
            {pageRows.map((p, idx) => {
              const s = computeProgress([p]);
              const st = statusOf.get(p.id)!;
              const open = expandedProposal === p.id;
              const updated = p.implementations.map((i) => i.updatedAt).sort().at(-1);
              return (
                <li key={p.id} className={cn(open && "bg-blue-50/40")}>
                  <button
                    onClick={() => setExpandedProposal(open ? null : p.id)}
                    className="w-full px-4 py-3.5 text-left"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-5 shrink-0 text-xs tabular-nums text-slate-400">{curPage * PAGE_SIZE + idx + 1}</span>
                      <p className="min-w-0 flex-1 text-pretty break-words text-[15px] font-semibold leading-snug text-blue-800">{p.title}</p>
                      {open ? <ChevronUp size={18} className="shrink-0 text-blue-500" /> : <ChevronDown size={18} className="shrink-0 text-slate-400" />}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
                      <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${festTheme(p.festival.type).badge}`}>
                        {sourceLabel(p.festival)}
                      </span>
                      <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">ข้อ {p.orderNumber}</span>
                      {p.subCommittees.map(({ subCommittee }) => (
                        <span key={subCommittee.id} className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {scShort(subCommittee.name)}
                        </span>
                      ))}
                      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${STATUS_PILL[st].cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_PILL[st].dot}`} />
                        {STATUS_LABELS[st]}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 pl-7">
                      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-emerald-500" style={{ width: `${s.completedPct}%` }} />
                        <div className="h-full bg-amber-400" style={{ width: `${Math.max(s.activePct - s.completedPct, 0)}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700">{s.activePct}%</span>
                    </div>
                    <p className="mt-1.5 pl-7 text-[11px] text-slate-400">
                      {p.expectedAgencyIds.length} หน่วยงานรับผิดชอบ
                      {p.dueDate && (
                        <span className={cn(isOverdue(p, now) && "font-semibold text-red-600")}>
                          {" "}· {isOverdue(p, now) ? "เลยกำหนด" : "กำหนด"} {thDate(p.dueDate)}
                        </span>
                      )}
                      {updated && <> · อัปเดต {thDate(updated)}</>}
                    </p>
                  </button>
                  {p.tags.length > 0 && (
                    <div className="-mt-2 flex flex-wrap gap-1 px-4 pb-3 pl-11">
                      {p.tags.map(({ tag }) => (
                        <Link
                          key={tag.id}
                          href={`/topics/${tag.id}`}
                          className="rounded-md bg-blue-50 px-1.5 py-px text-[11px] font-medium text-blue-700"
                        >
                          #{tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  {open && (
                    <div className="px-4 pb-4 pl-11">
                      <ProposalDetail proposal={p} agencies={data.agencies} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* แท็บเล็ต/เดสก์ท็อป: ตาราง — ซ่อนคอลัมน์รองตามความกว้าง */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                  <th className="w-10 px-4 py-3">#</th>
                  <th className="min-w-[13rem] px-3 py-3 xl:min-w-[15rem]">ชื่อ{noun}</th>
                  <th className="whitespace-nowrap px-3 py-3">ที่มา</th>
                  <th className="hidden whitespace-nowrap px-3 py-3 xl:table-cell">อนุกรรมการ</th>
                  <th className="hidden px-3 py-3 min-[1400px]:table-cell">หน่วยงานที่รับผิดชอบ</th>
                  <th className="whitespace-nowrap px-3 py-3">สถานะ</th>
                  <th className="min-w-[7.5rem] whitespace-nowrap px-3 py-3 xl:min-w-[10rem]">ความคืบหน้า</th>
                  <th className="hidden whitespace-nowrap px-3 py-3 xl:table-cell">กำหนดเสร็จ / อัปเดต</th>
                  <th className="w-10 px-3 py-3"><span className="sr-only">รายละเอียด</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      {q ? <>ไม่พบรายการที่ตรงกับ &ldquo;{searchQuery}&rdquo;</> : `ยังไม่มี${noun}`}
                    </td>
                  </tr>
                )}
                {pageRows.map((p, idx) => {
                  const s = computeProgress([p]);
                  const st = statusOf.get(p.id)!;
                  const open = expandedProposal === p.id;
                  const theme = festTheme(p.festival.type);
                  const updated = p.implementations.map((i) => i.updatedAt).sort().at(-1);
                  const firstAgency = p.expectedAgencyIds.map((id) => agencyName.get(id)).find(Boolean);
                  return (
                    <Fragment key={p.id}>
                      <tr
                        className={cn("cursor-pointer transition-colors hover:bg-blue-50/40", open && "bg-blue-50/40")}
                        onClick={() => setExpandedProposal(open ? null : p.id)}
                      >
                        <td className="px-4 py-3 text-slate-500 tabular-nums">{curPage * PAGE_SIZE + idx + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <FileText size={16} className="mt-0.5 shrink-0 text-blue-500" />
                            <div className="min-w-0">
                              <p className="text-pretty break-words font-semibold leading-snug text-blue-800">{p.title}</p>
                              {p.tags.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {p.tags.map(({ tag }) => (
                                    <Link
                                      key={tag.id}
                                      href={`/topics/${tag.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="rounded-md bg-blue-50 px-1.5 py-px text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                                    >
                                      #{tag.name}
                                    </Link>
                                  ))}
                                </div>
                              )}
                              <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                ข้อ {p.orderNumber}
                                {isOverdue(p, now) && (
                                  <span className="rounded bg-red-50 px-1.5 py-px text-[10px] font-semibold text-red-600">เลยกำหนด</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium ${theme.badge}`}>
                            {sourceLabel(p.festival)}
                          </span>
                        </td>
                        <td className="hidden px-3 py-3 xl:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {p.subCommittees.map(({ subCommittee }) => (
                              <span key={subCommittee.id} title={subCommittee.name} className="whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {scShort(subCommittee.name)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 text-slate-600 min-[1400px]:table-cell">
                          {firstAgency ? (
                            <span className="line-clamp-1 max-w-[14rem]" title={p.expectedAgencyIds.map((id) => agencyName.get(id)).filter(Boolean).join(", ")}>
                              {firstAgency}
                              {p.expectedAgencyIds.length > 1 && (
                                <span className="text-slate-400"> +{p.expectedAgencyIds.length - 1}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_PILL[st].cls}`}>
                            <span className={`h-2 w-2 rounded-full ${STATUS_PILL[st].dot}`} />
                            {STATUS_LABELS[st]}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full bg-emerald-500" style={{ width: `${s.completedPct}%` }} />
                              <div className="h-full bg-amber-400" style={{ width: `${Math.max(s.activePct - s.completedPct, 0)}%` }} />
                            </div>
                            <span className="w-9 text-right text-xs tabular-nums text-slate-600">{s.activePct}%</span>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3 xl:table-cell">
                          {p.dueDate && (
                            <p className={cn("text-sm", isOverdue(p, now) ? "font-semibold text-red-600" : "text-slate-700")}>
                              {thDate(p.dueDate)}
                            </p>
                          )}
                          <p className={cn(p.dueDate ? "text-[11px] text-slate-400" : "text-sm text-slate-500")}>
                            {p.dueDate ? "อัปเดต " : ""}{updated ? thDate(updated) : "—"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {open ? <ChevronUp size={16} className="mx-auto text-blue-500" /> : <ChevronDown size={16} className="mx-auto text-slate-400" />}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50/70">
                          <td />
                          <td colSpan={8} className="px-3 py-3">
                            <ProposalDetail proposal={p} agencies={data.agencies} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>
              แสดง {tableRows.length === 0 ? 0 : curPage * PAGE_SIZE + 1}–{Math.min((curPage + 1) * PAGE_SIZE, tableRows.length)} จาก {tableRows.length} ข้อเสนอ
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={curPage === 0}
                  onClick={() => setPage(curPage - 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  ก่อนหน้า
                </button>
                <span className="px-2 tabular-nums">{curPage + 1} / {pageCount}</span>
                <button
                  disabled={curPage >= pageCount - 1}
                  onClick={() => setPage(curPage + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        </Panel>
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
                      <Link
                        href={`/committees/${sc.id}`}
                        className="flex items-center justify-end gap-1 px-6 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        ดูหน้าอนุฯ — การประชุมและเรื่องสืบเนื่อง →
                      </Link>
                      {proposals.map((p) => {
                        const ps = computeProgress([p]);
                        const { activePct: pPct, completedPct: pDonePct } = ps;
                        return (
                          <div key={p.id} className="px-6 py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${festTheme(p.festival.type).badge}`}>
                                  {festIcon(p.festival.type)} {sourceLabel(p.festival)}
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
              sourceKind(i.proposal.festival.type) === kind &&
              (festivalId === "all" || i.proposal.festival.id === festivalId)
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
                              {sourceLabel(impl.proposal.festival)}
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
    </div>

      <FAQSection />

      {data.siteConfig.site_footnote && (
        <footer className="border-t border-slate-100 py-5 text-center bg-white">
          <p className="text-xs text-slate-400 whitespace-pre-wrap max-w-3xl mx-auto px-4">{data.siteConfig.site_footnote}</p>
        </footer>
      )}
    </div>
  );
}
