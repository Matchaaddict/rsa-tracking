"use client";

import { useEffect, useState } from "react";
import { STATUS_LABELS, festIcon, festTheme } from "@/lib/utils";
import { KIND_META, SOURCE_KINDS, sourceKind, sourceLabel, type SourceKind } from "@/lib/tracking";
import { SecretariatNotes, type SecretariatNote } from "./tracking/SecretariatNotes";
import { Activity, Loader2, NotebookPen, Printer, Search, X } from "lucide-react";
import { Button } from "./ui/button";

interface Festival { id: string; name: string; type: string; year: number }
interface SubCommittee { id: string; name: string }
interface Agency { id: string; name: string; subCommittees: { subCommittee: SubCommittee }[] }
interface ProgressEntry { id: string; content: string; status: string; createdAt: string; updatedAt: string; staffLabel?: string | null }
interface Implementation {
  agencyId: string;
  status: string;
  content: string | null;
  updatedAt: string;
  agency: { id: string; name: string };
  progressEntries: ProgressEntry[];
}
interface Proposal {
  id: string; title: string; description: string | null; orderNumber: number;
  notes?: SecretariatNote[];
  festival: Festival; festivalId: string;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: Implementation[];
  expectedAgencyIds: string[];
}
interface DashboardData { festivals: Festival[]; proposals: Proposal[]; agencies: Agency[] }

const STATUS_SYMBOL: Record<string, string> = {
  COMPLETED: "✓", IN_PROGRESS: "◑", NOT_STARTED: "○", NOT_RELEVANT: "–",
};
const STATUS_BG: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  NOT_STARTED: "bg-gray-50 text-gray-400",
  NOT_RELEVANT: "bg-slate-50 text-slate-400",
};
const STATUS_DOT: Record<string, string> = {
  COMPLETED: "bg-green-500", IN_PROGRESS: "bg-yellow-400", NOT_STARTED: "bg-gray-300", NOT_RELEVANT: "bg-slate-300",
};

function formatThaiDate(iso: string, withTime = true) {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const scShort = (name: string) => {
  const n = name.match(/^C(\d+)/)?.[1];
  return n ? `อนุฯ ${n}` : name.replace(/^C\d+:\s*/, "");
};

// ความเคลื่อนไหว 1 รายการ: รายงานจากหน่วยงาน (หรือเลขาฯ บันทึกให้) หรือบันทึกจากฝ่ายเลขานุการฯ
type ActivityItem = {
  key: string;
  at: string;
  proposal: Proposal;
  who: string;
  byStaff?: string | null;
  status?: string;
  isNote?: boolean;
  content: string;
};

function activitiesOf(proposals: Proposal[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const p of proposals) {
    for (const impl of p.implementations) {
      if (impl.progressEntries.length === 0) {
        if (impl.content) out.push({ key: `i-${p.id}-${impl.agencyId}`, at: impl.updatedAt, proposal: p, who: impl.agency.name, status: impl.status, content: impl.content });
        continue;
      }
      for (const e of impl.progressEntries) {
        out.push({ key: `e-${e.id}`, at: e.createdAt, proposal: p, who: impl.agency.name, byStaff: e.staffLabel, status: e.status, content: e.content });
      }
    }
    for (const n of p.notes ?? []) {
      out.push({ key: `n-${n.id}`, at: String(n.createdAt), proposal: p, who: n.authorLabel, isNote: true, content: n.content });
    }
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function ReportPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKind, setSelectedKind] = useState<SourceKind | null>(null);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedSC, setSelectedSC] = useState<string>("all");
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [historyMode, setHistoryMode] = useState<"current" | "all">("current");
  const [showMatrix, setShowMatrix] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  useEffect(() => {
    fetch("/api/public/dashboard?fullHistory=true").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={36} />
    </div>
  );
  if (!data) return null;

  // รายงานแยกตามประเภทที่มา — ไม่รวมเทศกาลกับการประชุมในสรุปเดียวกัน
  // เปิดมาครั้งแรกที่ประเภทที่มีความเคลื่อนไหวล่าสุด เพื่อให้เห็นข้อมูลที่เพิ่งกรอกทันที
  const kinds = SOURCE_KINDS.filter(k => data.festivals.some(f => sourceKind(f.type) === k));
  const latest = activitiesOf(data.proposals)[0];
  const autoKind = latest ? sourceKind(latest.proposal.festival.type) : kinds[0];
  const wanted = selectedKind ?? autoKind;
  const kind: SourceKind = wanted && kinds.includes(wanted) ? wanted : kinds[0] ?? "FESTIVAL";
  const allKindFestivals = data.festivals.filter(f => sourceKind(f.type) === kind);
  // เลือกปีก่อน แล้วค่อยเลือกครั้ง/วาระ — ที่มาหลายปีจะไม่ปนกัน
  const years = [...new Set(allKindFestivals.map(f => f.year))].sort((a, b) => b - a);
  const year = selectedYear !== "all" && years.includes(selectedYear) ? selectedYear : "all";
  const kindFestivals = year === "all" ? allKindFestivals : allKindFestivals.filter(f => f.year === year);
  const festivalSel = kindFestivals.some(f => f.id === selectedFestival) ? selectedFestival : "all";

  const allSubCommittees = [...new Map(
    data.proposals
      .filter(p => sourceKind(p.festival.type) === kind)
      .flatMap(p => p.subCommittees.map(s => [s.subCommittee.id, s.subCommittee] as const))
  ).values()].sort((a, b) => a.name.localeCompare(b.name, "th"));

  const allAgencies = [...data.agencies].sort((a, b) => a.name.localeCompare(b.name, "th"));
  const agencyName = new Map(data.agencies.map(a => [a.id, a.name]));

  const kw = keyword.trim().toLowerCase();
  const kwTokens = kw.split(/\s+/).filter(Boolean);
  const proposalsRaw = data.proposals.filter(p => {
    if (sourceKind(p.festival.type) !== kind) return false;
    if (year !== "all" && p.festival.year !== year) return false;
    if (festivalSel !== "all" && p.festivalId !== festivalSel) return false;
    if (selectedSC !== "all" && !p.subCommittees.some(s => s.subCommittee.id === selectedSC)) return false;
    if (selectedAgency !== "all" && !p.expectedAgencyIds.includes(selectedAgency)) return false;
    if (kwTokens.length > 0) {
      const haystack = [
        p.title,
        p.description ?? "",
        ...p.implementations.map(i => i.content ?? ""),
        ...(p.notes ?? []).map(n => n.content),
      ].join("  ").toLowerCase();
      if (!kwTokens.every(t => haystack.includes(t))) return false;
    }
    return true;
  });

  // เมื่อกรองหน่วยงาน ให้เหลือเฉพาะ implementation ของหน่วยงานนั้นใน section ต่างๆ
  const proposals: Proposal[] = selectedAgency === "all"
    ? proposalsRaw
    : proposalsRaw.map(p => ({ ...p, implementations: p.implementations.filter(i => i.agencyId === selectedAgency) }));

  // When "ทั้งหมด", group by source (year desc) so ข้อ numbers from different sources don't mix
  const festivalGroups: { festival: Festival; proposals: Proposal[] }[] = (() => {
    if (festivalSel !== "all") {
      const f = data.festivals.find(f => f.id === festivalSel);
      return f ? [{ festival: f, proposals }] : [];
    }
    const map = new Map<string, { festival: Festival; proposals: Proposal[] }>();
    proposals.forEach(p => {
      if (!map.has(p.festivalId)) map.set(p.festivalId, { festival: p.festival, proposals: [] });
      map.get(p.festivalId)!.proposals.push(p);
    });
    return [...map.values()].sort((a, b) => b.festival.year - a.festival.year || a.festival.type.localeCompare(b.festival.type));
  })();
  const multiGroup = festivalSel === "all" && festivalGroups.length > 1;

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  // summary stats — ใช้ expectedAgencyIds เป็นตัวหารเมื่อดูภาพรวม (สอดคล้องกับหน้าแรก)
  const totalDone = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "COMPLETED").length, 0);
  const totalInProg = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "IN_PROGRESS").length, 0);
  const totalNotRel = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "NOT_RELEVANT").length, 0);
  const totalRelevant = selectedAgency === "all"
    ? proposals.reduce((acc, p) => acc + p.expectedAgencyIds.length, 0) - totalNotRel
    : proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status !== "NOT_RELEVANT").length, 0);
  const totalNotStarted = Math.max(totalRelevant - totalDone - totalInProg, 0);
  const overallActive = totalRelevant > 0 ? Math.round(((totalDone + totalInProg) / totalRelevant) * 100) : 0;
  const overallDone = totalRelevant > 0 ? Math.round((totalDone / totalRelevant) * 100) : 0;

  const activity = activitiesOf(proposals);
  const shownActivity = showAllActivity ? activity.slice(0, 50) : activity.slice(0, 6);

  const festivalLabel = festivalSel === "all"
    ? (kind === "FESTIVAL" ? "ข้อเสนอเทศกาลทุกวาระ" : `${KIND_META[kind].label}ทั้งหมด`) + (year !== "all" ? ` ปี ${year}` : "")
    : (() => { const f = data.festivals.find(f => f.id === festivalSel); return f ? `${sourceLabel(f)}` : ""; })();
  const scLabel = selectedSC === "all" ? "" : scShort(allSubCommittees.find(s => s.id === selectedSC)?.name ?? "");
  const agencyLabel = selectedAgency === "all" ? "" : (agencyName.get(selectedAgency) ?? "");
  const keywordLabel = kw ? `ค้นหา: "${keyword.trim()}"` : "";
  const reportLabel = [festivalLabel, scLabel, agencyLabel, keywordLabel].filter(Boolean).join(" · ");

  const hasFilters = year !== "all" || festivalSel !== "all" || selectedSC !== "all" || selectedAgency !== "all" || kw !== "";
  const selectCls = (active: boolean) =>
    `w-full min-w-0 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      active ? "bg-blue-50 text-blue-700 border-blue-300 font-medium" : "bg-white text-gray-700 border-gray-200"
    }`;
  const toggleCls = (on: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border cursor-pointer transition-colors ${
      on ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <div className="space-y-5">
      {/* แถบเครื่องมือ */}
      <div className="print:hidden space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">รายงานผลการดำเนินงาน</h1>
            <p className="text-sm text-gray-500">เลือกเรื่องที่ต้องการ แล้วกดพิมพ์หรือบันทึกเป็น PDF ได้ทันที</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer size={16} /> พิมพ์ / บันทึก PDF
          </Button>
        </div>

        {kinds.length > 1 && (
          <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 w-fit max-w-full">
            {kinds.map(k => (
              <button key={k} onClick={() => { setSelectedKind(k); setSelectedYear("all"); setSelectedFestival("all"); setSelectedSC("all"); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${k === kind ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {KIND_META[k].icon} {KIND_META[k].label}
              </button>
            ))}
          </div>
        )}

        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${years.length > 1 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          {years.length > 1 && (
            <select
              value={year}
              onChange={(e) => { setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value)); setSelectedFestival("all"); }}
              className={selectCls(year !== "all")}
              aria-label="ปี"
            >
              <option value="all">ทุกปี</option>
              {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
            </select>
          )}
          <select value={festivalSel} onChange={(e) => setSelectedFestival(e.target.value)} className={selectCls(festivalSel !== "all")} aria-label="ที่มา">
            <option value="all">
              {kind === "FESTIVAL" ? "ทุกวาระ" : `ทุก${KIND_META[kind].label}`}{year !== "all" ? ` ปี ${year}` : ""}
            </option>
            {[...new Set(kindFestivals.map(f => f.year))].map(y => (
              <optgroup key={y} label={`ปี ${y}`}>
                {kindFestivals.filter(f => f.year === y).map(f => <option key={f.id} value={f.id}>{sourceLabel(f)}</option>)}
              </optgroup>
            ))}
          </select>
          <select value={selectedSC} onChange={(e) => setSelectedSC(e.target.value)} className={selectCls(selectedSC !== "all")} aria-label="อนุกรรมการ">
            <option value="all">ทุกอนุกรรมการ</option>
            {allSubCommittees.map(sc => (
              <option key={sc.id} value={sc.id}>
                {/^C\d+/.test(sc.name) ? `${scShort(sc.name)} — ${sc.name.replace(/^C\d+:\s*/, "")}` : sc.name}
              </option>
            ))}
          </select>
          <select value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} className={selectCls(selectedAgency !== "all")} aria-label="หน่วยงาน">
            <option value="all">ทุกหน่วยงาน</option>
            {allAgencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className={`relative flex items-center rounded-lg border ${kw ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"}`}>
            <Search size={14} className={`absolute left-2.5 ${kw ? "text-blue-500" : "text-gray-400"}`} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ค้นหา เช่น รถสาธารณะ"
              className="w-full min-w-0 bg-transparent py-2 pl-8 pr-7 text-sm outline-none placeholder:text-gray-400"
            />
            {keyword && (
              <button type="button" onClick={() => setKeyword("")} className="absolute right-1.5 rounded p-0.5 text-blue-600 hover:bg-blue-100" aria-label="ล้างคำค้น">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className={toggleCls(historyMode === "all")}>
            <input type="checkbox" checked={historyMode === "all"} onChange={(e) => setHistoryMode(e.target.checked ? "all" : "current")} className="rounded text-blue-600" />
            แสดงประวัติการรายงานทุกครั้ง
          </label>
          <label className={toggleCls(showMatrix)}>
            <input type="checkbox" checked={showMatrix} onChange={(e) => setShowMatrix(e.target.checked)} className="rounded text-blue-600" />
            แนบตารางสรุปรายอนุกรรมการ
          </label>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSelectedYear("all"); setSelectedFestival("all"); setSelectedSC("all"); setSelectedAgency("all"); setKeyword(""); }}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8 rounded-xl border border-gray-200 bg-white p-4 sm:p-6 print:space-y-6 print:rounded-none print:border-0 print:p-0">
        {/* หัวรายงาน */}
        <div className="border-b pb-5 text-center">
          <p className="mb-1 text-sm text-gray-400">Road Safety Actions Tracking (RSAT)</p>
          <h1 className="text-lg font-bold leading-snug text-gray-900">
            รายงานสรุปผลการติดตามข้อเสนอแนวทางในการป้องกันและลดอุบัติเหตุทางถนน
          </h1>
          <p className="mt-1 text-base font-semibold text-blue-700">{reportLabel}</p>
          <p className="mt-1 text-xs text-gray-400">ข้อมูล ณ วันที่ {today}</p>
        </div>

        {proposals.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm">ไม่พบเรื่องที่ตรงกับเงื่อนไข — ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
          </div>
        ) : (
          <>
            {/* 1. ภาพรวม */}
            <section>
              <h2 className="mb-3 text-base font-bold text-gray-800">1. ภาพรวม</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "เรื่องทั้งหมด", value: proposals.length, color: "text-blue-700", bg: "bg-blue-50" },
                  { label: "หน่วยงานดำเนินการแล้ว", value: totalDone, color: "text-green-700", bg: "bg-green-50" },
                  { label: "กำลังดำเนินการ", value: totalInProg, color: "text-yellow-700", bg: "bg-yellow-50" },
                  { label: "ยังไม่รายงาน/ยังไม่เริ่ม", value: totalNotStarted, color: "text-gray-600", bg: "bg-gray-50" },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                    <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="mt-1 text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-green-500" style={{ width: `${overallDone}%` }} />
                  <div className="h-full bg-yellow-400" style={{ width: `${overallActive - overallDone}%` }} />
                </div>
                <span className="shrink-0 tabular-nums text-gray-600">
                  ดำเนินการแล้ว/กำลังทำ <b className="text-gray-900">{overallActive}%</b> · เสร็จ {overallDone}%
                </span>
              </div>
            </section>

            {/* 2. ความเคลื่อนไหวล่าสุด */}
            <section className="print:break-inside-avoid">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-800">
                <Activity size={17} className="text-blue-600" /> 2. ความเคลื่อนไหวล่าสุด
              </h2>
              <p className="mb-3 text-xs text-gray-500">ข้อมูลที่หน่วยงานรายงาน และบันทึกจากฝ่ายเลขานุการฯ เรียงจากใหม่สุด</p>
              {activity.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">ยังไม่มีการรายงาน</p>
              ) : (
                <>
                  <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {shownActivity.map((a) => (
                      <li key={a.key} className="flex gap-3 px-3 py-2.5 sm:px-4 print:break-inside-avoid">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${a.isNote ? "bg-teal-500" : STATUS_DOT[a.status ?? "NOT_STARTED"]}`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                            <span className={`font-semibold ${a.isNote ? "text-teal-700" : "text-gray-800"}`}>{a.who}</span>
                            {a.isNote ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-teal-700">
                                <NotebookPen size={10} /> บันทึก · ไม่นับ %
                              </span>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_BG[a.status ?? "NOT_STARTED"]}`}>
                                {STATUS_LABELS[a.status ?? "NOT_STARTED"]}
                              </span>
                            )}
                            {a.byStaff && (
                              <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{`${a.byStaff} บันทึกให้`}</span>
                            )}
                            <span>{formatThaiDate(a.at)}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            <span className="font-medium text-gray-600">ข้อ {a.proposal.orderNumber}</span> {a.proposal.title}
                            {multiGroup && <span className="text-gray-400"> · {sourceLabel(a.proposal.festival)}</span>}
                          </p>
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-800 print:line-clamp-none">{a.content}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {activity.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllActivity(!showAllActivity)}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline print:hidden"
                    >
                      {showAllActivity ? "แสดงน้อยลง" : `ดูทั้งหมด (${Math.min(activity.length, 50)} รายการล่าสุด)`}
                    </button>
                  )}
                </>
              )}
            </section>

            {/* 3. ผลการดำเนินงานรายข้อ */}
            <section>
              <h2 className="mb-1 text-base font-bold text-gray-800">3. ผลการดำเนินงานรายข้อ</h2>
              <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> ดำเนินการแล้ว</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> กำลังดำเนินการ</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> ไม่เกี่ยวข้อง</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> บันทึกจากฝ่ายเลขาฯ (ไม่นับ %)</span>
              </p>
              <div className="space-y-6">
                {festivalGroups.map(({ festival, proposals: groupProposals }, fgIdx) => (
                  <div key={festival.id} className="space-y-3">
                    {multiGroup && (
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${fgIdx > 0 ? "print:break-before-page" : ""} ${festTheme(festival.type).pill}`}>
                        {festIcon(festival.type)} {sourceLabel(festival)}
                        <span className="ml-auto text-xs font-normal opacity-75">{groupProposals.length} เรื่อง</span>
                      </div>
                    )}
                    {groupProposals.map((p) => (
                      <ProposalCard
                        key={p.id}
                        p={p}
                        showSource={!multiGroup}
                        selectedAgency={selectedAgency}
                        historyMode={historyMode}
                        agencyName={agencyName}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* 4. ตารางสรุปรายอนุกรรมการ (เลือกแนบได้) */}
            {showMatrix && (
              <section className="print:break-before-page">
                <h2 className="mb-1 text-base font-bold text-gray-800">4. ตารางสรุปรายอนุกรรมการ</h2>
                <SubCommitteeMatrix proposals={proposals} agencies={data.agencies} selectedAgency={selectedAgency} />
              </section>
            )}
          </>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400">
          ระบบติดตามข้อเสนอแนวทางฯ (RSAT) · ข้อมูล ณ วันที่ {today}
        </div>
      </div>
    </div>
  );
}

// การ์ดรายข้อ: % ความคืบหน้า + ผลที่หน่วยงานรายงาน + บันทึกฝ่ายเลขาฯ + หน่วยงานที่ยังไม่รายงาน
function ProposalCard({
  p,
  showSource,
  selectedAgency,
  historyMode,
  agencyName,
}: {
  p: Proposal;
  showSource: boolean;
  selectedAgency: string;
  historyMode: "current" | "all";
  agencyName: Map<string, string>;
}) {
  const done = p.implementations.filter(i => i.status === "COMPLETED").length;
  const inProg = p.implementations.filter(i => i.status === "IN_PROGRESS").length;
  const notRel = p.implementations.filter(i => i.status === "NOT_RELEVANT").length;
  const total = selectedAgency === "all"
    ? Math.max(p.expectedAgencyIds.length - notRel, 0)
    : Math.max(1 - notRel, 0); // single agency: expected exactly 1
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const activePct = total > 0 ? Math.round(((done + inProg) / total) * 100) : 0;

  const order: Record<string, number> = { COMPLETED: 0, IN_PROGRESS: 1, NOT_RELEVANT: 2, NOT_STARTED: 3 };
  const reported = p.implementations
    .filter(i => i.status !== "NOT_STARTED" || i.content)
    .slice()
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.agency.name.localeCompare(b.agency.name, "th"));
  const answered = new Set(p.implementations.filter(i => i.status !== "NOT_STARTED").map(i => i.agencyId));
  const silent = p.expectedAgencyIds
    .filter(id => selectedAgency === "all" || id === selectedAgency)
    .filter(id => !answered.has(id))
    .map(id => agencyName.get(id) ?? id);

  return (
    <article className="rounded-lg border border-gray-200 print:break-inside-avoid">
      <header className="flex items-start gap-3 border-b border-gray-100 p-3 sm:p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
          {p.orderNumber}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-gray-900">{p.title}</p>
          {p.description && p.description.trim() !== p.title.trim() && (
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{p.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {showSource && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${festTheme(p.festival.type).pill}`}>
                {festIcon(p.festival.type)} {sourceLabel(p.festival)}
              </span>
            )}
            {p.subCommittees.map(sc => (
              <span key={sc.subCommittee.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {scShort(sc.subCommittee.name)}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
              <div className="h-full bg-yellow-400" style={{ width: `${Math.max(activePct - pct, 0)}%` }} />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-gray-500">
              เสร็จ {done}/{total} หน่วย{inProg > 0 ? ` · กำลังทำ ${inProg}` : ""}
            </span>
          </div>
        </div>
        <p className="shrink-0 text-xl font-bold tabular-nums text-gray-900">{pct}%</p>
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        {reported.length === 0 ? (
          <p className="text-sm italic text-gray-400">ยังไม่มีหน่วยงานรายงานผล</p>
        ) : (
          <ul className="space-y-3">
            {reported.map((impl) => {
              const entries = (impl.progressEntries ?? []).slice().sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              return (
                <li key={impl.agencyId} className="flex items-start gap-2.5 print:break-inside-avoid">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[impl.status]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-gray-800">{impl.agency.name}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${STATUS_BG[impl.status]}`}>{STATUS_LABELS[impl.status]}</span>
                      <span className="text-[11px] text-gray-400">{formatThaiDate(impl.updatedAt, false)}</span>
                      {historyMode !== "all" && entries[0]?.staffLabel && (
                        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                          {`${entries[0].staffLabel} บันทึกให้ · รอหน่วยงานยืนยัน`}
                        </span>
                      )}
                    </p>
                    {historyMode === "all" && entries.length > 0 ? (
                      <div className="mt-1.5 space-y-2 border-l-2 border-gray-200 pl-3">
                        {entries.map((entry) => (
                          <div key={entry.id}>
                            <p className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                              <span>{formatThaiDate(entry.createdAt)}</span>
                              <span className={`rounded-full px-1.5 py-0.5 ${STATUS_BG[entry.status]}`}>{STATUS_LABELS[entry.status]}</span>
                              {entry.staffLabel && (
                                <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{`${entry.staffLabel} บันทึกให้`}</span>
                              )}
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-700">{entry.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : impl.content ? (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-700">{impl.content}</p>
                    ) : (
                      <p className="mt-0.5 text-sm italic text-gray-400">
                        {impl.status === "NOT_RELEVANT" ? "(หน่วยงานระบุว่าไม่เกี่ยวข้อง)" : "(ยังไม่ได้กรอกรายละเอียด)"}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <SecretariatNotes notes={p.notes} />

        {silent.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            <span className="font-semibold">ยังไม่รายงาน ({silent.length}):</span> {silent.join(", ")}
          </p>
        )}
      </div>
    </article>
  );
}

// ตารางสัญลักษณ์ หน่วยงาน × ข้อ แยกตามอนุกรรมการ — สำหรับแนบท้ายเมื่อต้องการ
function SubCommitteeMatrix({ proposals, agencies, selectedAgency }: { proposals: Proposal[]; agencies: Agency[]; selectedAgency: string }) {
  const data = { agencies };
  const scMap = new Map<string, SubCommittee>();
  proposals.forEach(p => p.subCommittees.forEach(s => scMap.set(s.subCommittee.id, s.subCommittee)));
  const subCommittees = [...scMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (subCommittees.length === 0) return <p className="text-sm text-gray-400">ไม่มีเรื่องที่ผูกกับอนุกรรมการ</p>;

  return (
    <div>
      <div className="flex gap-4 text-xs text-gray-500 mb-4 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-100 text-green-800 text-center font-bold text-xs flex items-center justify-center">✓</span> เสร็จสิ้น</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-100 text-yellow-800 text-center font-bold text-xs flex items-center justify-center">◑</span> กำลังดำเนินการ</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-100 text-gray-400 text-center font-bold text-xs flex items-center justify-center">○</span> ยังไม่ดำเนินการ</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-slate-50 text-slate-400 text-center font-bold text-xs flex items-center justify-center">–</span> ไม่เกี่ยวข้อง</span>
      </div>
      {subCommittees.map((sc, scIdx) => {
        // ข้อเสนอของอนุนี้
        const scProposals = proposals.filter(p =>
          p.subCommittees.some(s => s.subCommittee.id === sc.id)
        );
        if (scProposals.length === 0) return null;

        // หน่วยงานในอนุนี้ (ถ้ากรองหน่วยงาน เหลือเฉพาะหน่วยที่เลือก)
        const scAgencies = data.agencies
          .filter(a => a.subCommittees.some(s => s.subCommittee.id === sc.id))
          .filter(a => selectedAgency === "all" || a.id === selectedAgency);
        if (scAgencies.length === 0) return null;

        // summary ของอนุนี้ — ใช้ expectedAgencyIds เป็นตัวหาร (สอดคล้องหน้าแรก)
        const scDone = scProposals.reduce((acc, p) =>
          acc + p.implementations.filter(i => i.status === "COMPLETED").length, 0);
        const scNotRel = scProposals.reduce((acc, p) =>
          acc + p.implementations.filter(i => i.status === "NOT_RELEVANT").length, 0);
        const scTotal = selectedAgency === "all"
          ? scProposals.reduce((acc, p) => acc + p.expectedAgencyIds.length, 0) - scNotRel
          : scProposals.length - scNotRel;
        const scPct = scTotal > 0 ? Math.round((scDone / scTotal) * 100) : 0;

        return (
          <div key={sc.id} className={`${scIdx > 0 ? "mt-8 print:mt-0 print:break-before-page" : ""}`}>
            {/* หัวอนุกรรมการ */}
            <div className="flex items-center justify-between bg-blue-600 text-white px-4 py-3 rounded-t-lg print:rounded-none">
              <div>
                <p className="font-bold text-base">{sc.name.replace(/^C(\d+):/, (_, n) => `อนุฯ ${n}:`)}</p>
                <p className="text-blue-100 text-xs mt-0.5">
                  {scProposals.length} ข้อเสนอ · {scAgencies.length} หน่วยงาน
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{scPct}%</p>
                <p className="text-blue-200 text-xs">เสร็จสิ้น {scDone}/{scTotal}</p>
              </div>
            </div>

            {/* Section 3: แต่ละวาระเป็น sub-section ของตัวเอง ไม่ปนกัน */}
            {(() => {
              const scFestivals = (() => {
                const map = new Map<string, { festival: Festival; proposals: Proposal[] }>();
                scProposals.forEach(p => {
                  if (!map.has(p.festivalId)) map.set(p.festivalId, { festival: p.festival, proposals: [] });
                  map.get(p.festivalId)!.proposals.push(p);
                });
                return [...map.values()].sort((a, b) =>
                  b.festival.year - a.festival.year || a.festival.type.localeCompare(b.festival.type)
                );
              })();
              const multiFest = scFestivals.length > 1;

              return (
                <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
                  {scFestivals.map(({ festival, proposals: festProposals }, festIdx) => (
                    <div key={festival.id} className={festIdx > 0 ? "border-t-2 border-gray-300" : ""}>
                      {/* Festival sub-header — แสดงเมื่อมีหลายวาระ */}
                      {multiFest && (
                        <div className={`px-4 py-2 flex items-center justify-between ${festTheme(festival.type).pill}`}>
                          <span className="text-sm font-semibold">
                            {festIcon(festival.type)} {sourceLabel(festival)}
                          </span>
                          <span className="text-xs opacity-75">{festProposals.length} ข้อเสนอ</span>
                        </div>
                      )}
                      {/* ตารางอ้างอิงชื่อข้อเสนอ */}
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {festProposals.map(p => (
                            <span key={p.id} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                              <span className="font-bold text-gray-800">ข้อ {p.orderNumber}</span>
                              {" · "}
                              {p.title.length > 32 ? p.title.slice(0, 30) + "…" : p.title}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* แถวรายหน่วยงาน — แสดงเฉพาะข้อเสนอในวาระนี้ */}
                      <div className="divide-y divide-gray-100">
                        {scAgencies.map(agency => {
                          const implMap = new Map(
                            festProposals.flatMap(p =>
                              p.implementations
                                .filter(i => i.agencyId === agency.id)
                                .map(i => [p.id, i] as const)
                            )
                          );
                          const agencyDone = [...implMap.values()].filter(i => i.status === "COMPLETED").length;
                          const agencyNotRel = [...implMap.values()].filter(i => i.status === "NOT_RELEVANT").length;
                          const agencyRelevant = festProposals.length - agencyNotRel;
                          const agencyPct = agencyRelevant > 0 ? Math.round((agencyDone / agencyRelevant) * 100) : 0;
                          return (
                            <div key={agency.id} className="px-3 sm:px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-1.5">
                              <div className="w-[calc(100%-64px)] sm:w-40 shrink-0 text-sm font-medium text-gray-800 pt-0.5 leading-snug break-words">
                                {agency.name}
                              </div>
                              <div className="order-last sm:order-none basis-full sm:basis-auto min-w-0 flex-1 flex flex-wrap items-center gap-1">
                                {festProposals.map(p => {
                                  const impl = implMap.get(p.id);
                                  const status = impl?.status ?? "NOT_STARTED";
                                  return (
                                    <span key={p.id} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BG[status]}`}>
                                      {STATUS_SYMBOL[status]}
                                      <span className="text-[10px] font-normal opacity-60">ข้อ{p.orderNumber}</span>
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="shrink-0 text-right min-w-[52px]">
                                <div className={`text-sm font-bold ${agencyPct === 100 ? "text-green-700" : agencyPct > 0 ? "text-yellow-700" : "text-gray-400"}`}>
                                  {agencyPct}%
                                </div>
                                <div className="text-xs text-gray-400">{agencyDone}/{agencyRelevant}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Footer รายข้อเสนอ */}
                      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {festProposals.map(p => {
                            const notRelCount = p.implementations.filter(i => i.status === "NOT_RELEVANT").length;
                            const footTotal = selectedAgency === "all"
                              ? Math.max(p.expectedAgencyIds.length - notRelCount, 0)
                              : Math.max(1 - notRelCount, 0);
                            const d = p.implementations.filter(i => i.status === "COMPLETED").length;
                            const pct = footTotal > 0 ? Math.round((d / footTotal) * 100) : 0;
                            return (
                              <div key={p.id} className={`text-xs rounded px-2 py-1 font-medium ${
                                pct === 100 ? "bg-green-100 text-green-800" :
                                pct > 0    ? "bg-yellow-100 text-yellow-800" :
                                             "bg-gray-100 text-gray-500"
                              }`}>
                                ข้อ {p.orderNumber}: {d}/{footTotal} ({pct}%)
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
