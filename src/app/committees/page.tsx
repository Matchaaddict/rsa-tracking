import Link from "next/link";
import { Building2, CalendarDays, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getShellInfo } from "@/lib/shellInfo";
import { prisma } from "@/lib/prisma";
import { getViewer, loadItems, visibleSourceWhere } from "@/lib/trackingData";
import { KIND_META, SOURCE_KINDS, computeProgress, currentTime, isOverdue, isUnresolved, sourceKind } from "@/lib/tracking";
import { ProgressBar, thDate } from "@/components/tracking/ItemBits";

export const dynamic = "force-dynamic";

export default async function CommitteesPage() {
  const viewer = await getViewer();
  const [subCommittees, { items }, info] = await Promise.all([
    prisma.subCommittee.findMany({
      orderBy: { name: "asc" },
      include: {
        agencies: { where: { agency: { isVisible: true } }, select: { agencyId: true } },
        sources: {
          where: { AND: [visibleSourceWhere(viewer), { type: "MEETING" }] },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          select: { id: true, name: true, date: true },
        },
      },
    }),
    loadItems({}, viewer),
    getShellInfo(),
  ]);
  const now = currentTime();

  return (
    <AppShell info={info}>
      <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold text-[#0b1d4d] sm:text-2xl">คณะอนุกรรมการ</h1>
          <p className="mt-1 text-sm text-slate-500">
            ความคืบหน้าแยกตามประเภทที่มา การประชุม และเรื่องสืบเนื่องที่ยังไม่แล้วเสร็จของแต่ละอนุฯ
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {subCommittees.map((sc) => {
            const mine = items.filter(
              (i) => i.subCommittees.some((s) => s.subCommitteeId === sc.id) || i.festival.subCommitteeId === sc.id
            );
            const meetingItems = mine.filter((i) => i.festival.type === "MEETING" && i.festival.subCommitteeId === sc.id);
            const carry = meetingItems.filter(isUnresolved).length;
            const late = meetingItems.filter((i) => isOverdue(i, now)).length;
            const kinds = SOURCE_KINDS.filter((k) => mine.some((i) => sourceKind(i.festival.type) === k));
            const last = sc.sources[0];
            return (
              <Link
                key={sc.id}
                href={`/committees/${sc.id}`}
                className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-balance font-bold leading-snug text-slate-800">
                    {sc.name.replace(/^C(\d+):\s*/, "อนุฯ $1 · ")}
                  </p>
                  <ChevronRight size={18} className="mt-0.5 shrink-0 text-slate-300 group-hover:text-blue-500" />
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Building2 size={12} /> {sc.agencies.length} หน่วยงาน</span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} /> ประชุม {sc.sources.length} ครั้ง
                    {last?.date && <> · ล่าสุด {thDate(last.date)}</>}
                  </span>
                </p>

                <div className="mt-3 space-y-2">
                  {kinds.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีเรื่องที่ติดตาม</p>}
                  {kinds.map((k) => {
                    const s = computeProgress(mine.filter((i) => sourceKind(i.festival.type) === k));
                    return (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-28 shrink-0 text-slate-600">{KIND_META[k].icon} {KIND_META[k].label}</span>
                        <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="flex-1" />
                        <span className="w-9 text-right tabular-nums text-slate-600">{s.activePct}%</span>
                      </div>
                    );
                  })}
                </div>

                {(carry > 0 || late > 0) && (
                  <p className="mt-3 flex flex-wrap gap-2 text-xs">
                    {carry > 0 && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700">
                        เรื่องสืบเนื่อง {carry}
                      </span>
                    )}
                    {late > 0 && (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 font-medium text-red-600">เลยกำหนด {late}</span>
                    )}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
