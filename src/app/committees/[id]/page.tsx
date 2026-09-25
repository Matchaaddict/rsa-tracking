import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Lock, Settings } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getShellInfo } from "@/lib/shellInfo";
import { prisma } from "@/lib/prisma";
import { getViewer, loadItems, visibleSourceWhere, type TrackedItem } from "@/lib/trackingData";
import { computeProgress, currentTime, isOverdue, isUnresolved, sourceKind, sourceLabel } from "@/lib/tracking";
import { festIcon } from "@/lib/utils";
import {
  DocLink,
  ItemRow,
  KindSummary,
  ProgressBar,
  SourceBadge,
  pendingAgencies,
  thDate,
} from "@/components/tracking/ItemBits";
import { PrintCarryOverButton } from "@/components/tracking/PrintCarryOverButton";

export const dynamic = "force-dynamic";

export default async function CommitteePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();

  const sc = await prisma.subCommittee.findUnique({
    where: { id },
    include: {
      agencies: { where: { agency: { isVisible: true } }, select: { agencyId: true } },
      sources: {
        where: visibleSourceWhere(viewer),
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!sc) notFound();

  // เรื่องของอนุฯ นี้ = เรื่องที่ผูกกับอนุฯ หรืออยู่ใต้ที่มาที่อนุฯ เป็นเจ้าของ
  const [{ items, agencyNames }, info] = await Promise.all([
    loadItems(
      { OR: [{ subCommittees: { some: { subCommitteeId: id } } }, { festival: { subCommitteeId: id } }] },
      viewer
    ),
    getShellInfo(),
  ]);
  const now = currentTime();
  const canManage = viewer.kind === "admin" || (viewer.kind === "secretary" && viewer.subCommitteeId === id);

  const meetings = sc.sources.filter((s) => s.type === "MEETING");
  const projects = sc.sources.filter((s) => s.type === "PROJECT");
  const itemsOf = (sourceId: string) => items.filter((i) => i.festivalId === sourceId);

  // เรื่องสืบเนื่อง: มติจากการประชุมของอนุฯ ที่ยังไม่แล้วเสร็จ — เลยกำหนดขึ้นก่อน แล้วเรียงตามกำหนดเสร็จ
  const carryOver = items
    .filter((i) => i.festival.type === "MEETING" && i.festival.subCommitteeId === id && isUnresolved(i))
    .sort((a, b) => {
      const oa = isOverdue(a, now) ? 0 : 1;
      const ob = isOverdue(b, now) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (da !== db) return da - db;
      return new Date(a.festival.date ?? a.festival.createdAt).getTime() - new Date(b.festival.date ?? b.festival.createdAt).getTime();
    });

  // ข้อเสนอจากเทศกาล / มติ ครม. สรุปรายที่มา
  const otherSources = new Map<string, { source: TrackedItem["festival"]; list: TrackedItem[] }>();
  items
    .filter((i) => ["FESTIVAL", "CABINET"].includes(sourceKind(i.festival.type)))
    .forEach((i) => {
      if (!otherSources.has(i.festivalId)) otherSources.set(i.festivalId, { source: i.festival, list: [] });
      otherSources.get(i.festivalId)!.list.push(i);
    });

  const scTitle = sc.name.replace(/^C(\d+):\s*/, "อนุฯ $1 · ");

  return (
    <AppShell info={info}>
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:px-6 lg:px-8">
        <div data-print-skip>
          <Link href="/committees" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 print:hidden">
            <ArrowLeft size={14} /> คณะกรรมการทั้งหมด
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-balance text-xl font-bold text-[#0b1d4d] sm:text-2xl">{scTitle}</h1>
              {sc.description && <p className="mt-1 text-sm text-slate-500">{sc.description}</p>}
              <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1"><Building2 size={14} /> {sc.agencies.length} หน่วยงาน</span>
                <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> ประชุม {meetings.length} ครั้ง</span>
              </p>
            </div>
            {canManage && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 print:hidden"
              >
                <Settings size={16} /> บันทึกการประชุม / เพิ่มมติ
              </Link>
            )}
          </div>
        </div>

        <div data-print-skip>
          <KindSummary items={items} now={now} />
        </div>

        {/* เรื่องสืบเนื่อง */}
        <section data-carryover className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="font-bold text-slate-800">เรื่องสืบเนื่อง (ยังไม่แล้วเสร็จ)</h2>
              <p className="text-xs text-slate-500">
                มติจากการประชุมครั้งก่อน ๆ ที่หน่วยงานยังดำเนินการไม่ครบ — ใช้ติดตามในวาระสืบเนื่องของการประชุมครั้งถัดไป
              </p>
              <p className="hidden text-xs text-slate-500 print:block">{scTitle} · ข้อมูล ณ {thDate(new Date(now))}</p>
            </div>
            {carryOver.length > 0 && <PrintCarryOverButton />}
          </div>
          {carryOver.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">ไม่มีเรื่องค้างจากการประชุม</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {carryOver.map((item, idx) => {
                const s = computeProgress([item]);
                const pending = pendingAgencies(item, agencyNames);
                const overdue = isOverdue(item, now);
                return (
                  <li key={item.id} className="break-inside-avoid px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                      <span className="text-sm font-semibold tabular-nums text-slate-400">{idx + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-pretty break-words font-semibold text-slate-800">{item.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <SourceBadge source={item.festival} />
                          <span>ข้อ {item.orderNumber}</span>
                          {item.dueDate && (
                            <span className={overdue ? "font-semibold text-red-600" : ""}>
                              {overdue ? "เลยกำหนด" : "กำหนด"} {thDate(item.dueDate)}
                            </span>
                          )}
                        </p>
                        {[
                          { label: "ยังไม่รายงาน", cls: "text-red-600", list: pending.filter((a) => !a.status) },
                          { label: "กำลังดำเนินการ", cls: "text-amber-700", list: pending.filter((a) => a.status) },
                        ]
                          .filter((g) => g.list.length > 0)
                          .map((g) => (
                            <p key={g.label} className="mt-1.5 text-xs leading-relaxed text-slate-600">
                              <span className={`font-medium ${g.cls}`}>{g.label} {g.list.length}:</span>{" "}
                              {g.list.map((a) => a.name).join(", ")}
                            </p>
                          ))}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:w-44">
                        <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="flex-1" />
                        <span className="w-9 text-right text-xs tabular-nums text-slate-600">{s.activePct}%</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* การประชุม */}
        <section data-print-skip className="space-y-3">
          <h2 className="font-bold text-slate-800">การประชุม</h2>
          {meetings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              ยังไม่มีการบันทึกการประชุม{canManage ? " — เพิ่มได้ที่แผงควบคุม แท็บ \"ที่มา\"" : ""}
            </p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-violet-100 pl-4 sm:pl-6">
              {meetings.map((m) => {
                const list = itemsOf(m.id);
                const s = computeProgress(list);
                return (
                  <li key={m.id} className="relative">
                    <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-white bg-violet-500 ring-2 ring-violet-100 sm:-left-[31px]" />
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {festIcon(m.type)} {m.name}
                            {!m.isPublic && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[11px] font-normal text-slate-600">
                                <Lock size={10} /> ภายใน
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {m.date ? `ประชุมวันที่ ${thDate(m.date)}` : `ปี ${m.year}`} · {list.length} มติ
                            {m.docUrl && <> · <DocLink href={m.docUrl} /></>}
                          </p>
                        </div>
                        {list.length > 0 && (
                          <div className="flex w-full items-center gap-2 sm:w-48">
                            <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="flex-1" />
                            <span className="w-9 text-right text-xs tabular-nums text-slate-600">{s.activePct}%</span>
                          </div>
                        )}
                      </div>
                      {list.map((item) => (
                        <ItemRow key={item.id} item={item} agencyNames={agencyNames} now={now} showSource={false} />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* โครงการเฉพาะ */}
        {projects.length > 0 && (
          <section data-print-skip className="space-y-3">
            <h2 className="font-bold text-slate-800">โครงการเฉพาะ</h2>
            {projects.map((p) => {
              const list = itemsOf(p.id);
              const s = computeProgress(list);
              return (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{festIcon(p.type)} {p.name}</p>
                      {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
                      {p.docUrl && <p className="text-xs"><DocLink href={p.docUrl} /></p>}
                    </div>
                    <div className="flex w-full items-center gap-2 sm:w-48">
                      <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="flex-1" />
                      <span className="w-9 text-right text-xs tabular-nums text-slate-600">{s.activePct}%</span>
                    </div>
                  </div>
                  {list.map((item) => (
                    <ItemRow key={item.id} item={item} agencyNames={agencyNames} now={now} showSource={false} />
                  ))}
                </div>
              );
            })}
          </section>
        )}

        {/* ข้อเสนอจากเทศกาล / มติ ครม. */}
        {otherSources.size > 0 && (
          <section data-print-skip className="space-y-3">
            <h2 className="font-bold text-slate-800">ข้อเสนอเชิงนโยบาย (เทศกาล / มติ ครม.)</h2>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {[...otherSources.values()].map(({ source, list }) => {
                const s = computeProgress(list);
                const open = list.filter(isUnresolved).length;
                return (
                  <details key={source.id} className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1 font-medium text-slate-800">
                        {festIcon(source.type)} {sourceLabel(source)}
                        <span className="ml-2 text-xs font-normal text-slate-500">{list.length} ข้อ · ค้าง {open}</span>
                      </span>
                      <span className="flex w-full items-center gap-2 sm:w-48">
                        <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="flex-1" />
                        <span className="w-9 text-right text-xs tabular-nums text-slate-600">{s.activePct}%</span>
                      </span>
                    </summary>
                    <div className="border-t border-slate-100">
                      {list.map((item) => (
                        <ItemRow key={item.id} item={item} agencyNames={agencyNames} now={now} showSource={false} />
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
