"use client";

import { useEffect, useState } from "react";
import { FESTIVAL_TYPE_LABELS, STATUS_LABELS, festIcon, festTheme } from "@/lib/utils";
import { Loader2, Printer, Search, X } from "lucide-react";
import { Button } from "./ui/button";

interface Festival { id: string; name: string; type: string; year: number }
interface SubCommittee { id: string; name: string }
interface Agency { id: string; name: string; subCommittees: { subCommittee: SubCommittee }[] }
interface ProgressEntry { id: string; content: string; status: string; createdAt: string; updatedAt: string }
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

export function ReportPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const [selectedSC, setSelectedSC] = useState<string>("all");
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [includeDetails, setIncludeDetails] = useState(false);
  const [historyMode, setHistoryMode] = useState<"current" | "all">("current");

  useEffect(() => {
    fetch("/api/public/dashboard?fullHistory=true").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={36} />
    </div>
  );
  if (!data) return null;

  const allSubCommittees = [...new Map(
    data.proposals.flatMap(p => p.subCommittees.map(s => [s.subCommittee.id, s.subCommittee] as const))
  ).values()].sort((a, b) => a.name.localeCompare(b.name, "th"));

  const allAgencies = [...data.agencies].sort((a, b) => a.name.localeCompare(b.name, "th"));

  const kw = keyword.trim().toLowerCase();
  const kwTokens = kw.split(/\s+/).filter(Boolean);
  const proposalsRaw = data.proposals.filter(p => {
    if (selectedFestival !== "all" && p.festivalId !== selectedFestival) return false;
    if (selectedSC !== "all" && !p.subCommittees.some(s => s.subCommittee.id === selectedSC)) return false;
    if (selectedAgency !== "all" && !p.expectedAgencyIds.includes(selectedAgency)) return false;
    if (kwTokens.length > 0) {
      const haystack = [
        p.title,
        p.description ?? "",
        ...p.implementations.map(i => i.content ?? ""),
      ].join("  ").toLowerCase();
      if (!kwTokens.every(t => haystack.includes(t))) return false;
    }
    return true;
  });

  // เมื่อกรองหน่วยงาน ให้เหลือเฉพาะ implementation ของหน่วยงานนั้นใน section ต่างๆ
  const proposals: Proposal[] = selectedAgency === "all"
    ? proposalsRaw
    : proposalsRaw.map(p => ({ ...p, implementations: p.implementations.filter(i => i.agencyId === selectedAgency) }));

  // When "ทุกวาระ", group by festival (year desc) so ข้อ numbers from different years don't mix
  const festivalGroups: { festival: Festival; proposals: Proposal[] }[] = (() => {
    if (selectedFestival !== "all") return [{ festival: data.festivals.find(f => f.id === selectedFestival)!, proposals }];
    const map = new Map<string, { festival: Festival; proposals: Proposal[] }>();
    proposals.forEach(p => {
      if (!map.has(p.festivalId)) map.set(p.festivalId, { festival: p.festival, proposals: [] });
      map.get(p.festivalId)!.proposals.push(p);
    });
    return [...map.values()].sort((a, b) => b.festival.year - a.festival.year || a.festival.type.localeCompare(b.festival.type));
  })();
  const multiGroup = selectedFestival === "all" && festivalGroups.length > 1;

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  // รวบรวม sub-committees ทั้งหมดที่มีข้อเสนอ
  const scMap = new Map<string, SubCommittee>();
  proposals.forEach(p => p.subCommittees.forEach(s => scMap.set(s.subCommittee.id, s.subCommittee)));
  const subCommittees = [...scMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  // summary stats — ใช้ expectedAgencyIds เป็นตัวหารเมื่อดูภาพรวม (สอดคล้องกับหน้าแรก)
  const totalDone = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "COMPLETED").length, 0);
  const totalInProg = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "IN_PROGRESS").length, 0);
  const totalNotRel = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "NOT_RELEVANT").length, 0);
  const totalRelevant = selectedAgency === "all"
    ? proposals.reduce((acc, p) => acc + p.expectedAgencyIds.length, 0) - totalNotRel
    : proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status !== "NOT_RELEVANT").length, 0);
  const totalNotStarted = Math.max(totalRelevant - totalDone - totalInProg, 0);

  const festivalLabel = selectedFestival === "all"
    ? "ทุกวาระ"
    : (() => { const f = data.festivals.find(f => f.id === selectedFestival); return f ? `${FESTIVAL_TYPE_LABELS[f.type]} ${f.year}` : ""; })();

  const scLabel = selectedSC === "all"
    ? ""
    : (() => {
        const sc = allSubCommittees.find(s => s.id === selectedSC);
        if (!sc) return "";
        const m = sc.name.match(/^C(\d+)/);
        return m ? `อนุฯ ${m[1]}` : sc.name;
      })();

  const agencyLabel = selectedAgency === "all"
    ? ""
    : (data.agencies.find(a => a.id === selectedAgency)?.name ?? "");

  const keywordLabel = kw ? `ค้นหา: "${keyword.trim()}"` : "";

  const reportLabel = [festivalLabel, scLabel, agencyLabel, keywordLabel].filter(Boolean).join(" · ");

  const hasFilters = selectedFestival !== "all" || selectedSC !== "all" || selectedAgency !== "all" || kw !== "";

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">หน้าสรุปสำหรับนำเสนอ</h1>
          <p className="text-sm text-gray-500">กดปุ่ม Print เพื่อพิมพ์หรือบันทึก PDF</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSelectedFestival("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedFestival === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
              ทุกวาระ
            </button>
            {data.festivals.map(f => (
              <button key={f.id} onClick={() => setSelectedFestival(f.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedFestival === f.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                {f.name}
              </button>
            ))}
          </div>
          <select
            value={selectedSC}
            onChange={(e) => setSelectedSC(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              selectedSC === "all"
                ? "bg-white text-gray-600 border-gray-200"
                : "bg-blue-50 text-blue-700 border-blue-300"
            }`}
          >
            <option value="all">ทุกอนุฯ</option>
            {allSubCommittees.map((sc) => {
              const m = sc.name.match(/^C(\d+)/);
              return (
                <option key={sc.id} value={sc.id}>
                  {m ? `อนุฯ ${m[1]} — ${sc.name.replace(/^C\d+:\s*/, "")}` : sc.name}
                </option>
              );
            })}
          </select>
          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[220px] ${
              selectedAgency === "all"
                ? "bg-white text-gray-600 border-gray-200"
                : "bg-blue-50 text-blue-700 border-blue-300"
            }`}
          >
            <option value="all">ทุกหน่วยงาน</option>
            {allAgencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className={`relative flex items-center border rounded-lg transition-colors ${
            kw ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
          }`}>
            <Search size={14} className={`absolute left-2.5 ${kw ? "text-blue-500" : "text-gray-400"}`} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ค้นหาคีย์เวิร์ด เช่น รถสาธารณะ"
              className="pl-8 pr-7 py-1.5 text-sm font-medium bg-transparent outline-none w-[220px] placeholder:text-gray-400"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-1.5 p-0.5 rounded hover:bg-blue-100 text-blue-600"
                aria-label="ล้างคำค้น"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedFestival("all");
                setSelectedSC("all");
                setSelectedAgency("all");
                setKeyword("");
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              ล้างตัวกรอง
            </button>
          )}
          <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
            includeDetails ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
            <input
              type="checkbox"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            รวมรายละเอียดผลการดำเนินงาน
          </label>
          {includeDetails && (
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setHistoryMode("current")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  historyMode === "current" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                ปัจจุบัน
              </button>
              <button
                type="button"
                onClick={() => setHistoryMode("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  historyMode === "all" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                ประวัติทั้งหมด
              </button>
            </div>
          )}
          <Button onClick={() => window.print()} className="gap-2">
            <Printer size={16} /> พิมพ์ / บันทึก PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 print:border-0 print:rounded-none p-6 print:p-0 space-y-8">

        {/* หัวรายงาน */}
        <div className="text-center border-b pb-5">
          <p className="text-sm text-gray-400 mb-1">Road Safety Actions Tracking (RSAT)</p>
          <h1 className="text-lg font-bold text-gray-900 leading-snug">
            รายงานสรุปผลการติดตามข้อเสนอแนวทางในการป้องกันและลดอุบัติเหตุทางถนน
          </h1>
          <p className="text-base font-semibold text-blue-700 mt-1">{reportLabel}</p>
          <p className="text-xs text-gray-400 mt-1">วันที่พิมพ์: {today}</p>
        </div>

        {proposals.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">ไม่พบข้อเสนอที่ตรงกับเงื่อนไข — ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
          </div>
        )}

        {/* 1. ภาพรวม */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">1. ภาพรวม</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "ข้อเสนอทั้งหมด", value: proposals.length, color: "text-blue-700", bg: "bg-blue-50" },
              { label: "ดำเนินการแล้ว", value: totalDone, color: "text-green-700", bg: "bg-green-50" },
              { label: "กำลังดำเนินการ", value: totalInProg, color: "text-yellow-700", bg: "bg-yellow-50" },
              { label: "ยังไม่ดำเนินการ", value: totalNotStarted, color: "text-gray-600", bg: "bg-gray-50" },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. ความคืบหน้ารายข้อเสนอ */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">2. ความคืบหน้ารายข้อเสนอ</h2>
          <div className="space-y-4">
            {festivalGroups.map(({ festival, proposals: groupProposals }) => (
              <div key={festival.id}>
                {multiGroup && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-sm font-semibold ${festTheme(festival.type).pill}`}>
                    {festIcon(festival.type)} {FESTIVAL_TYPE_LABELS[festival.type]} {festival.year}
                  </div>
                )}
                <div className="space-y-2">
                  {groupProposals.map(p => {
                    const done = p.implementations.filter(i => i.status === "COMPLETED").length;
                    const inProg = p.implementations.filter(i => i.status === "IN_PROGRESS").length;
                    const notStarted = p.implementations.filter(i => i.status === "NOT_STARTED").length;
                    const notRel = p.implementations.filter(i => i.status === "NOT_RELEVANT").length;
                    const total = selectedAgency === "all"
                      ? Math.max(p.expectedAgencyIds.length - notRel, 0)
                      : Math.max(1 - notRel, 0); // single agency: expected exactly 1
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                    return (
                      <div key={p.id} className="border border-gray-100 rounded-lg p-3 print:break-inside-avoid">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                            {p.orderNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{p.title}</p>
                                {p.description && p.description.trim() !== p.title.trim() && (
                                  <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">
                                    {p.description}
                                  </p>
                                )}
                                {!multiGroup && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${festTheme(p.festival.type).pill}`}>
                                      {festIcon(p.festival.type)} {FESTIVAL_TYPE_LABELS[p.festival.type]} {p.festival.year}
                                    </span>
                                    {p.subCommittees.map(sc => {
                                      const n = sc.subCommittee.name.match(/^C(\d+)/)?.[1];
                                      return (
                                        <span key={sc.subCommittee.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                          {n ? `อนุฯ ${n}` : sc.subCommittee.name.replace(/^C\d+:\s*/, "")}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                {multiGroup && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {p.subCommittees.map(sc => {
                                      const n = sc.subCommittee.name.match(/^C(\d+)/)?.[1];
                                      return (
                                        <span key={sc.subCommittee.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                          {n ? `อนุฯ ${n}` : sc.subCommittee.name.replace(/^C\d+:\s*/, "")}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xl font-bold text-gray-900">{pct}%</p>
                                <p className="text-xs text-gray-400">{done}/{total} หน่วย</p>
                              </div>
                            </div>
                            {/* Segmented bar */}
                            <div className="mt-2 h-2.5 rounded-full overflow-hidden flex bg-gray-100">
                              {total > 0 && <>
                                {done > 0 && <div className="bg-green-500 h-full" style={{ width: `${(done / total) * 100}%` }} />}
                                {inProg > 0 && <div className="bg-yellow-400 h-full" style={{ width: `${(inProg / total) * 100}%` }} />}
                                {notStarted > 0 && <div className="bg-gray-200 h-full" style={{ width: `${(notStarted / total) * 100}%` }} />}
                              </>}
                            </div>
                            <div className="flex gap-3 mt-1 text-xs flex-wrap">
                              <span className="text-green-600">✓ เสร็จ {done}</span>
                              {inProg > 0 && <span className="text-yellow-600">◑ กำลังทำ {inProg}</span>}
                              {notStarted > 0 && <span className="text-gray-400">○ ยังไม่ตอบ {notStarted}</span>}
                              {notRel > 0 && <span className="text-slate-400">– ไม่เกี่ยวข้อง {notRel}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. ตารางแยกตามอนุกรรมการ */}
        {subCommittees.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">3. รายละเอียดรายอนุกรรมการ</h2>
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
                : scProposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status !== "NOT_RELEVANT").length, 0);
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

                  {/* List layout — รายหน่วยงาน ไม่มีตารางแนวนอน */}
                  <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
                    {/* ตารางอ้างอิงชื่อข้อเสนอ */}
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-1.5">
                      {scProposals.map(p => (
                        <span key={p.id} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                          <span className="font-bold text-gray-800">ข้อ {p.orderNumber}</span>
                          {" · "}
                          {p.title.length > 32 ? p.title.slice(0, 30) + "…" : p.title}
                        </span>
                      ))}
                    </div>

                    {/* แถวรายหน่วยงาน */}
                    <div className="divide-y divide-gray-100">
                      {scAgencies.map((agency) => {
                        const implMap = new Map(
                          scProposals.flatMap(p =>
                            p.implementations
                              .filter(i => i.agencyId === agency.id)
                              .map(i => [p.id, i] as const)
                          )
                        );
                        const agencyDone = [...implMap.values()].filter(i => i.status === "COMPLETED").length;
                        const agencyNotRel = [...implMap.values()].filter(i => i.status === "NOT_RELEVANT").length;
                        const agencyRelevant = scProposals.length - agencyNotRel;
                        const agencyPct = agencyRelevant > 0 ? Math.round((agencyDone / agencyRelevant) * 100) : 0;

                        return (
                          <div key={agency.id} className="px-4 py-2.5 flex items-start gap-3">
                            {/* ชื่อหน่วยงาน */}
                            <div className="w-40 shrink-0 text-sm font-medium text-gray-800 pt-0.5 leading-snug">
                              {agency.name}
                            </div>
                            {/* Status pills */}
                            <div className="flex-1 flex flex-wrap gap-1">
                              {scProposals.map(p => {
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
                            {/* สรุปรายหน่วยงาน */}
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

                    {/* สรุปรายข้อเสนอ (footer) */}
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-1.5">
                      {scProposals.map(p => {
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
              );
            })}
          </div>
        )}

        {/* 4. รายละเอียดผลการดำเนินงาน — แสดงเมื่อ user ติ๊ก checkbox */}
        {includeDetails && (
          <div className="print:break-before-page">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
              4. รายละเอียดผลการดำเนินงาน
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {historyMode === "all"
                ? `ประวัติการรายงานทั้งหมดของแต่ละหน่วยงาน เรียงจากใหม่สุด — พิมพ์เมื่อ ${today}`
                : `ข้อมูลที่หน่วยงานรายงานล่าสุด ณ วันที่ ${today}`}
            </p>

            <div className="space-y-6">
              {festivalGroups.map(({ festival, proposals: groupProposals }, fgIdx) => (
                <div key={festival.id}>
                  {multiGroup && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm font-semibold ${fgIdx > 0 ? "print:break-before-page" : ""} ${festTheme(festival.type).pill}`}>
                      {festIcon(festival.type)} {FESTIVAL_TYPE_LABELS[festival.type]} {festival.year}
                    </div>
                  )}
                  <div className="space-y-4">
                    {groupProposals.map((p) => {
                      const order: Record<string, number> = { COMPLETED: 0, IN_PROGRESS: 1, NOT_RELEVANT: 2, NOT_STARTED: 3 };
                      const reported = p.implementations
                        .filter((i) => i.status !== "NOT_STARTED")
                        .slice()
                        .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.agency.name.localeCompare(b.agency.name, "th"));

                      return (
                        <div key={p.id} className="border border-gray-200 rounded-lg p-4 print:break-inside-avoid">
                          <div className="flex items-start gap-3 pb-3 mb-3 border-b border-gray-100">
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-700">
                              {p.orderNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{p.title}</p>
                              {p.description && p.description.trim() !== p.title.trim() && (
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{p.description}</p>
                              )}
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {!multiGroup && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${festTheme(p.festival.type).pill}`}>
                                    {festIcon(p.festival.type)} {FESTIVAL_TYPE_LABELS[p.festival.type]} {p.festival.year}
                                  </span>
                                )}
                                {p.subCommittees.map((sc) => {
                                  const n = sc.subCommittee.name.match(/^C(\d+)/)?.[1];
                                  return (
                                    <span key={sc.subCommittee.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                      {n ? `อนุฯ ${n}` : sc.subCommittee.name.replace(/^C\d+:\s*/, "")}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {reported.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">ยังไม่มีหน่วยงานรายงานผล</p>
                          ) : (
                            <div className="space-y-3">
                              {reported.map((impl) => {
                                const entries = (impl.progressEntries ?? []).slice().sort((a, b) =>
                                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                );
                                return (
                                  <div key={impl.agencyId} className="flex items-start gap-3 print:break-inside-avoid">
                                    <span className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${STATUS_BG[impl.status]}`}>
                                      {STATUS_SYMBOL[impl.status]}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-800">{impl.agency.name}</p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_BG[impl.status]}`}>
                                          {STATUS_LABELS[impl.status]}
                                        </span>
                                        {impl.updatedAt && (
                                          <span className="text-[10px] text-gray-400">
                                            อัปเดต {formatThaiDate(impl.updatedAt)}
                                          </span>
                                        )}
                                      </div>

                                      {historyMode === "all" && entries.length > 0 ? (
                                        <div className="mt-2 border-l-2 border-gray-200 pl-3 space-y-2">
                                          {entries.map((entry) => (
                                            <div key={entry.id} className="text-sm">
                                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
                                                <span>{formatThaiDate(entry.createdAt)}</span>
                                                <span className={`px-1.5 py-0.5 rounded-full ${STATUS_BG[entry.status]}`}>
                                                  {STATUS_LABELS[entry.status]}
                                                </span>
                                              </div>
                                              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{entry.content}</p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : impl.content ? (
                                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{impl.content}</p>
                                      ) : (
                                        <p className="text-sm text-gray-400 italic mt-0.5">
                                          {impl.status === "NOT_RELEVANT" ? "(หน่วยงานระบุว่าไม่เกี่ยวข้อง)" : "(ยังไม่ได้กรอกรายละเอียด)"}
                                        </p>
                                      )}
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400">
          ระบบติดตามข้อเสนอแนวทางฯ (RSAT) · พิมพ์เมื่อ {today}
        </div>
      </div>
    </div>
  );
}
