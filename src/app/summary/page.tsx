import { prisma } from "@/lib/db";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const committees = await prisma.committee.findMany({
    orderBy: { order: "asc" },
    include: {
      guidelines: {
        orderBy: { order: "asc" },
        include: {
          responses: {
            include: { agency: { select: { id: true, name: true } } },
          },
        },
      },
      agencies: {
        where: { isAdmin: false },
        select: { id: true, name: true },
      },
    },
  });

  function calcGuidelineProgress(guidelineResponses: { agencyId: number }[], totalAgencies: number) {
    if (totalAgencies === 0) return 0;
    return (guidelineResponses.length / totalAgencies) * 100;
  }

  function calcCommitteeProgress(
    guidelines: { responses: { agencyId: number }[] }[],
    totalAgencies: number
  ) {
    if (totalAgencies === 0 || guidelines.length === 0) return 0;
    const totalPossible = guidelines.length * totalAgencies;
    const totalDone = guidelines.reduce((sum, g) => sum + g.responses.length, 0);
    return (totalDone / totalPossible) * 100;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-900">สรุปผลการดำเนินงาน</h1>
        <p className="text-gray-600 mt-1">
          ภาพรวมการรายงานผลการดำเนินงานตามข้อเสนอแนวทางของทุกคณะอนุกรรมการ
        </p>
      </div>

      {committees.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">ยังไม่มีข้อมูล</p>
          <p className="text-sm mt-2">
            <Link href="/login" className="text-blue-600 hover:underline">ผู้ดูแลระบบ</Link>
            {" "}สามารถเพิ่มข้อมูลได้
          </p>
        </div>
      )}

      <div className="space-y-6">
        {committees.map((committee) => {
          const totalAgencies = committee.agencies.length;
          const overallProgress = calcCommitteeProgress(committee.guidelines, totalAgencies);

          return (
            <div key={committee.id} className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="bg-blue-900 text-white px-6 py-4">
                <h2 className="text-lg font-bold">{committee.name}</h2>
                {committee.description && (
                  <p className="text-blue-200 text-sm mt-0.5">{committee.description}</p>
                )}
                <div className="mt-3">
                  <ProgressBar value={overallProgress} size="lg" />
                </div>
                <p className="text-blue-200 text-xs mt-1">
                  {totalAgencies > 0
                    ? `${totalAgencies} หน่วยงาน | ${committee.guidelines.length} แนวทาง`
                    : "ยังไม่มีหน่วยงาน"}
                </p>
              </div>

              <div className="p-4 space-y-4">
                {committee.guidelines.map((guideline, idx) => {
                  const progress = calcGuidelineProgress(guideline.responses, totalAgencies);
                  const respondedAgencies = new Set(guideline.responses.map((r) => r.agencyId));

                  return (
                    <details key={guideline.id} className="group border border-gray-100 rounded-xl overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 select-none">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate">{guideline.title}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                          <div className="w-24">
                            <ProgressBar value={progress} showPercent={false} size="sm" />
                          </div>
                          <span className="text-xs text-gray-500 w-16 text-right">
                            {guideline.responses.length}/{totalAgencies}
                          </span>
                          <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </summary>

                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                        {guideline.description && (
                          <p className="text-sm text-gray-600 mt-3 mb-3 leading-relaxed">{guideline.description}</p>
                        )}
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                            หน่วยงานในอนุกรรมการ
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {committee.agencies.map((agency) => {
                              const hasResponded = respondedAgencies.has(agency.id);
                              const response = guideline.responses.find((r) => r.agencyId === agency.id);
                              return (
                                <div key={agency.id} className="relative group/badge">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium cursor-default ${
                                      hasResponded
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : "bg-gray-100 text-gray-500 border border-gray-200"
                                    }`}
                                  >
                                    {hasResponded ? "✓ " : ""}{agency.name}
                                  </span>
                                  {hasResponded && response && (
                                    <div className="absolute bottom-full left-0 mb-1 hidden group-hover/badge:block z-10 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 whitespace-pre-wrap">
                                      <p className="font-semibold text-gray-800 mb-1">{agency.name}</p>
                                      {response.progress}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {committee.agencies.length === 0 && (
                              <span className="text-xs text-gray-400">ยังไม่มีหน่วยงาน</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </details>
                  );
                })}

                {committee.guidelines.length === 0 && (
                  <p className="text-sm text-gray-400 py-2 px-2">ยังไม่มีข้อเสนอแนวทาง</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
