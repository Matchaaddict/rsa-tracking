"use client";

import { useEffect, useState } from "react";
import { FESTIVAL_TYPE_LABELS, STATUS_LABELS, festIcon, festTheme } from "@/lib/utils";
import { Loader2, Printer } from "lucide-react";
import { Button } from "./ui/button";

interface Festival { id: string; name: string; type: string; year: number }
interface SubCommittee { id: string; name: string }
interface Agency { id: string; name: string; subCommittees: { subCommittee: SubCommittee }[] }
interface Implementation { agencyId: string; status: string; content: string | null; agency: { id: string; name: string } }
interface Proposal {
  id: string; title: string; description: string | null; orderNumber: number;
  festival: Festival; festivalId: string;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: Implementation[];
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

export function ReportPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const [selectedSC, setSelectedSC] = useState<string>("all");
  const [includeDetails, setIncludeDetails] = useState(false);

  useEffect(() => {
    fetch("/api/public/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false); });
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

  const proposals = data.proposals.filter(p => {
    if (selectedFestival !== "all" && p.festivalId !== selectedFestival) return false;
    if (selectedSC !== "all" && !p.subCommittees.some(s => s.subCommittee.id === selectedSC)) return false;
    return true;
  });

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  // รวบรวม sub-committees ทั้งหมดที่มีข้อเสนอ
  const scMap = new Map<string, SubCommittee>();
  proposals.forEach(p => p.subCommittees.forEach(s => scMap.set(s.subCommittee.id, s.subCommittee)));
  const subCommittees = [...scMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  // summary stats
  const totalDone = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "COMPLETED").length, 0);
  const totalInProg = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "IN_PROGRESS").length, 0);
  const totalNotStarted = proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "NOT_STARTED").length, 0);

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

  const reportLabel = [festivalLabel, scLabel].filter(Boolean).join(" · ");

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
          <div className="space-y-2">
            {proposals.map(p => {
              const relevant = p.implementations.filter(i => i.status !== "NOT_RELEVANT");
              const done = relevant.filter(i => i.status === "COMPLETED").length;
              const inProg = relevant.filter(i => i.status === "IN_PROGRESS").length;
              const notStarted = relevant.filter(i => i.status === "NOT_STARTED").length;
              const notRel = p.implementations.filter(i => i.status === "NOT_RELEVANT").length;
              const total = relevant.length;
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

              // หน่วยงานในอนุนี้
              const scAgencies = data.agencies.filter(a =>
                a.subCommittees.some(s => s.subCommittee.id === sc.id)
              );
              if (scAgencies.length === 0) return null;

              // summary ของอนุนี้
              const scDone = scProposals.reduce((acc, p) =>
                acc + p.implementations.filter(i => i.status === "COMPLETED").length, 0);
              const scRelevant = scProposals.reduce((acc, p) =>
                acc + p.implementations.filter(i => i.status !== "NOT_RELEVANT").length, 0);
              const scPct = scRelevant > 0 ? Math.round((scDone / scRelevant) * 100) : 0;

              return (
                <div key={sc.id} className={`print:break-before-page ${scIdx > 0 ? "mt-8 print:mt-0" : ""}`}>
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
                      <p className="text-blue-200 text-xs">เสร็จสิ้น {scDone}/{scRelevant}</p>
                    </div>
                  </div>

                  {/* ตาราง */}
                  <div className="overflow-x-auto border border-t-0 border-gray-200 rounded-b-lg">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-[160px] sticky left-0 bg-gray-50">
                            หน่วยงาน
                          </th>
                          {scProposals.map(p => (
                            <th key={p.id} className="border-b border-r border-gray-200 px-2 py-2 text-center font-medium text-gray-600 min-w-[44px] max-w-[44px]">
                              <div className="font-bold text-gray-800">ข้อ {p.orderNumber}</div>
                            </th>
                          ))}
                          <th className="border-b border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[56px]">
                            เสร็จ/รวม
                          </th>
                        </tr>
                        {/* แถวชื่อข้อเสนอ */}
                        <tr className="bg-blue-50">
                          <td className="border-b border-r border-gray-200 px-3 py-1.5 text-gray-500 italic text-xs sticky left-0 bg-blue-50">
                            ชื่อข้อเสนอ
                          </td>
                          {scProposals.map(p => (
                            <td key={p.id} className="border-b border-r border-gray-200 px-1 py-1.5 text-center text-gray-600 text-xs leading-tight">
                              <div className="max-w-[80px] mx-auto truncate" title={p.title}>
                                {p.title.length > 20 ? p.title.slice(0, 18) + "…" : p.title}
                              </div>
                            </td>
                          ))}
                          <td className="border-b border-gray-200" />
                        </tr>
                      </thead>
                      <tbody>
                        {scAgencies.map((agency, idx) => {
                          const implMap = new Map(
                            scProposals.flatMap(p =>
                              p.implementations
                                .filter(i => i.agencyId === agency.id)
                                .map(i => [p.id, i])
                            )
                          );
                          const done = [...implMap.values()].filter(i => i.status === "COMPLETED").length;
                          const relevant = [...implMap.values()].filter(i => i.status !== "NOT_RELEVANT").length;

                          return (
                            <tr key={agency.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                              <td className={`border-b border-r border-gray-100 px-3 py-2 font-medium text-gray-800 sticky left-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                {agency.name}
                              </td>
                              {scProposals.map(p => {
                                const impl = implMap.get(p.id);
                                if (!impl) {
                                  return (
                                    <td key={p.id} className="border-b border-r border-gray-100 text-center text-gray-200 py-2">○</td>
                                  );
                                }
                                return (
                                  <td key={p.id} className={`border-b border-r border-gray-100 text-center font-bold py-2 ${STATUS_BG[impl.status]}`}>
                                    {STATUS_SYMBOL[impl.status]}
                                  </td>
                                );
                              })}
                              <td className="border-b border-gray-100 text-center font-semibold text-gray-700 py-2">
                                {done}/{relevant}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Summary row */}
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border-t border-r border-gray-200 px-3 py-2 text-gray-700 sticky left-0 bg-gray-100">
                            รวม
                          </td>
                          {scProposals.map(p => {
                            const rel = p.implementations.filter(i => i.status !== "NOT_RELEVANT");
                            const d = rel.filter(i => i.status === "COMPLETED").length;
                            const pct = rel.length > 0 ? Math.round((d / rel.length) * 100) : 0;
                            return (
                              <td key={p.id} className="border-t border-r border-gray-200 text-center py-2">
                                <div className={`text-sm font-bold ${pct === 100 ? "text-green-700" : pct > 0 ? "text-yellow-700" : "text-gray-400"}`}>
                                  {pct}%
                                </div>
                                <div className="text-xs text-gray-400">{d}/{rel.length}</div>
                              </td>
                            );
                          })}
                          <td className="border-t border-gray-200 text-center py-2">
                            <div className={`text-sm font-bold ${scPct === 100 ? "text-green-700" : scPct > 0 ? "text-yellow-700" : "text-gray-400"}`}>
                              {scPct}%
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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
              ข้อมูลที่หน่วยงานรายงานล่าสุด ณ วันที่ {today}
            </p>

            <div className="space-y-4">
              {proposals.map((p) => {
                // เรียงตามสถานะ: เสร็จ → กำลังทำ → ไม่เกี่ยวข้อง
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
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${festTheme(p.festival.type).pill}`}>
                            {festIcon(p.festival.type)} {FESTIVAL_TYPE_LABELS[p.festival.type]} {p.festival.year}
                          </span>
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
                        {reported.map((impl) => (
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
                              </div>
                              {impl.content ? (
                                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{impl.content}</p>
                              ) : (
                                <p className="text-sm text-gray-400 italic mt-0.5">
                                  {impl.status === "NOT_RELEVANT" ? "(หน่วยงานระบุว่าไม่เกี่ยวข้อง)" : "(ยังไม่ได้กรอกรายละเอียด)"}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
