"use client";

import { useEffect, useState } from "react";
import { STATUS_LABELS, FESTIVAL_TYPE_LABELS } from "@/lib/utils";
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
  COMPLETED: "✓",
  IN_PROGRESS: "◑",
  NOT_STARTED: "○",
  NOT_RELEVANT: "–",
};
const STATUS_BG: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  NOT_STARTED: "bg-gray-100 text-gray-500",
  NOT_RELEVANT: "bg-slate-100 text-slate-400",
};

export function ReportPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");

  useEffect(() => {
    fetch("/api/public/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={36} />
    </div>
  );
  if (!data) return null;

  const proposals = selectedFestival === "all"
    ? data.proposals
    : data.proposals.filter(p => p.festivalId === selectedFestival);

  // หน่วยงานที่มีส่วนเกี่ยวข้องกับข้อเสนอที่กรอง
  const involvedAgencyIds = new Set(proposals.flatMap(p => p.implementations.map(i => i.agencyId)));
  const involvedAgencies = data.agencies.filter(a => involvedAgencyIds.has(a.id));

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      {/* Toolbar - hidden on print */}
      <div className="print:hidden flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">หน้าสรุปสำหรับนำเสนอ</h1>
          <p className="text-sm text-gray-500">กดปุ่ม Print เพื่อพิมพ์หรือบันทึก PDF</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Festival filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSelectedFestival("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedFestival === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
              ทุกเทศกาล
            </button>
            {data.festivals.map(f => (
              <button key={f.id} onClick={() => setSelectedFestival(f.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedFestival === f.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                {f.name}
              </button>
            ))}
          </div>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer size={16} /> พิมพ์ / บันทึก PDF
          </Button>
        </div>
      </div>

      {/* ===== PRINT CONTENT ===== */}
      <div className="bg-white rounded-xl border border-gray-200 print:border-0 print:rounded-none p-6 print:p-0 space-y-8">

        {/* Header */}
        <div className="text-center border-b pb-4 print:pb-6">
          <p className="text-sm text-gray-500 mb-1">Road Safety Action Thailand (RSAT)</p>
          <h1 className="text-xl font-bold text-gray-900 leading-snug">
            รายงานสรุปผลการติดตามข้อเสนอแนวทางในการป้องกันและลดอุบัติเหตุทางถนน
          </h1>
          {selectedFestival !== "all" && data.festivals.find(f => f.id === selectedFestival) && (
            <p className="text-base font-medium text-blue-700 mt-1">
              {FESTIVAL_TYPE_LABELS[data.festivals.find(f => f.id === selectedFestival)!.type]}{" "}
              {data.festivals.find(f => f.id === selectedFestival)!.year}
            </p>
          )}
          <p className="text-sm text-gray-400 mt-2">วันที่พิมพ์: {today}</p>
        </div>

        {/* Summary stats */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">1. ภาพรวม</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            {[
              { label: "ข้อเสนอทั้งหมด", value: proposals.length, color: "text-blue-700" },
              {
                label: "เสร็จสิ้นแล้ว",
                value: proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "COMPLETED").length, 0),
                color: "text-green-700"
              },
              {
                label: "กำลังดำเนินการ",
                value: proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "IN_PROGRESS").length, 0),
                color: "text-yellow-700"
              },
              {
                label: "ยังไม่ดำเนินการ",
                value: proposals.reduce((acc, p) => acc + p.implementations.filter(i => i.status === "NOT_STARTED").length, 0),
                color: "text-gray-600"
              },
            ].map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Per-proposal progress */}
        <div className="print:break-inside-avoid">
          <h2 className="text-base font-semibold text-gray-800 mb-3">2. ความคืบหน้ารายข้อเสนอ</h2>
          <div className="space-y-3">
            {proposals.map(p => {
              const relevant = p.implementations.filter(i => i.status !== "NOT_RELEVANT");
              const done = relevant.filter(i => i.status === "COMPLETED").length;
              const inProg = relevant.filter(i => i.status === "IN_PROGRESS").length;
              const notStarted = relevant.filter(i => i.status === "NOT_STARTED").length;
              const notRel = p.implementations.filter(i => i.status === "NOT_RELEVANT").length;
              const total = relevant.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div key={p.id} className="border border-gray-200 rounded-lg p-3 print:break-inside-avoid">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-400">ข้อ {p.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.festival.type === "NEW_YEAR" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {FESTIVAL_TYPE_LABELS[p.festival.type]} {p.festival.year}
                        </span>
                        {p.subCommittees.map(sc => (
                          <span key={sc.subCommittee.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {sc.subCommittee.name.split(":")[0]}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1">{p.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">{pct}%</p>
                      <p className="text-xs text-gray-500">{done}/{total} หน่วย</p>
                    </div>
                  </div>
                  {/* Segmented progress bar */}
                  <div className="h-3 rounded-full overflow-hidden flex gap-0.5 bg-gray-100">
                    {total > 0 && <>
                      {done > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${(done / total) * 100}%` }} />}
                      {inProg > 0 && <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(inProg / total) * 100}%` }} />}
                      {notStarted > 0 && <div className="bg-gray-300 h-full transition-all" style={{ width: `${(notStarted / total) * 100}%` }} />}
                    </>}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span className="text-green-600">✓ เสร็จ {done}</span>
                    {inProg > 0 && <span className="text-yellow-600">◑ กำลังทำ {inProg}</span>}
                    {notStarted > 0 && <span className="text-gray-400">○ ยังไม่ตอบ {notStarted}</span>}
                    {notRel > 0 && <span className="text-slate-400">– ไม่เกี่ยวข้อง {notRel}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Matrix table */}
        {proposals.length > 0 && involvedAgencies.length > 0 && (
          <div className="print:break-before-page">
            <h2 className="text-base font-semibold text-gray-800 mb-1">3. ตารางสรุปรายหน่วยงาน</h2>
            <div className="flex gap-4 text-xs text-gray-500 mb-3 flex-wrap">
              <span className="text-green-600">✓ เสร็จสิ้น</span>
              <span className="text-yellow-600">◑ กำลังดำเนินการ</span>
              <span className="text-gray-400">○ ยังไม่ดำเนินการ</span>
              <span className="text-slate-400">– ไม่เกี่ยวข้อง</span>
              <span className="text-gray-300">· ไม่เกี่ยวข้องกับอนุฯ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 min-w-[180px]">
                      หน่วยงาน
                    </th>
                    {proposals.map(p => (
                      <th key={p.id} className="border border-gray-200 px-1 py-2 text-center font-medium text-gray-600 min-w-[36px]">
                        <div className="writing-mode-vertical">{p.orderNumber}</div>
                      </th>
                    ))}
                    <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">
                      เสร็จ/ทั้งหมด
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {involvedAgencies.map((agency, idx) => {
                    const agencyImpls = new Map(
                      proposals.flatMap(p =>
                        p.implementations
                          .filter(i => i.agencyId === agency.id)
                          .map(i => [p.id, i])
                      )
                    );
                    const agencyScs = new Set(agency.subCommittees.map(s => s.subCommittee.id));
                    const done = [...agencyImpls.values()].filter(i => i.status === "COMPLETED").length;
                    const relevant = [...agencyImpls.values()].filter(i => i.status !== "NOT_RELEVANT").length;

                    return (
                      <tr key={agency.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-200 px-2 py-1.5 text-gray-800 font-medium text-xs">
                          {agency.name}
                        </td>
                        {proposals.map(p => {
                          const impl = agencyImpls.get(p.id);
                          const proposalScs = new Set(p.subCommittees.map(s => s.subCommittee.id));
                          const isRelated = [...proposalScs].some(id => agencyScs.has(id));

                          if (!isRelated) {
                            return (
                              <td key={p.id} className="border border-gray-200 text-center text-gray-200">·</td>
                            );
                          }
                          if (!impl) {
                            return (
                              <td key={p.id} className="border border-gray-200 text-center text-gray-300">○</td>
                            );
                          }
                          return (
                            <td key={p.id} className={`border border-gray-200 text-center font-medium ${STATUS_BG[impl.status]}`}>
                              {STATUS_SYMBOL[impl.status]}
                            </td>
                          );
                        })}
                        <td className="border border-gray-200 text-center font-semibold text-gray-700">
                          {done}/{relevant}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:right-0">
          ระบบติดตามข้อเสนอแนวทางฯ (RSAT) · พิมพ์เมื่อ {today}
        </div>
      </div>
    </div>
  );
}
