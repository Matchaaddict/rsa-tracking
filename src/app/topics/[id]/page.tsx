import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hash } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getShellInfo } from "@/lib/shellInfo";
import { prisma } from "@/lib/prisma";
import { getViewer, loadItems } from "@/lib/trackingData";
import { KIND_META, SOURCE_KINDS, currentTime, sourceKind } from "@/lib/tracking";
import { ItemRow, KindSummary } from "@/components/tracking/ItemBits";

export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) notFound();

  const [{ items, agencyNames }, info] = await Promise.all([
    loadItems({ tags: { some: { tagId: id } } }, viewer),
    getShellInfo(),
  ]);
  const now = currentTime();
  const kinds = SOURCE_KINDS.filter((k) => items.some((i) => sourceKind(i.festival.type) === k));

  // หน่วยงานที่เกี่ยวข้องกับประเด็นนี้ เรียงตามจำนวนเรื่องที่ยังไม่เสร็จ
  const agencyRows = new Map<string, { name: string; total: number; done: number; active: number; silent: number }>();
  items.forEach((item) => {
    const byAgency = new Map(item.implementations.map((i) => [i.agencyId, i.status]));
    item.expectedAgencyIds.forEach((aid) => {
      const st = byAgency.get(aid);
      if (st === "NOT_RELEVANT") return;
      const row = agencyRows.get(aid) ?? { name: agencyNames.get(aid) ?? aid, total: 0, done: 0, active: 0, silent: 0 };
      row.total++;
      if (st === "COMPLETED") row.done++;
      else if (st === "IN_PROGRESS") row.active++;
      else if (!st) row.silent++;
      agencyRows.set(aid, row);
    });
  });
  const agencies = [...agencyRows.values()].sort((a, b) => b.total - b.done - (a.total - a.done) || a.name.localeCompare(b.name, "th"));

  return (
    <AppShell info={info}>
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:px-6 lg:px-8">
        <div>
          <Link href="/topics" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
            <ArrowLeft size={14} /> ประเด็นทั้งหมด
          </Link>
          <h1 className="mt-2 flex items-center gap-1 text-xl font-bold text-[#0b1d4d] sm:text-2xl">
            <Hash size={24} className="shrink-0 text-blue-500" />
            <span className="break-words">{tag.name}</span>
          </h1>
          {tag.description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{tag.description}</p>}
          <p className="mt-1 text-sm text-slate-500">
            {items.length} เรื่องจาก {new Set(items.map((i) => i.festivalId)).size} ที่มา · หน่วยงานเกี่ยวข้อง {agencies.length} แห่ง
          </p>
        </div>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
            ยังไม่มีเรื่องที่เปิดเผยในประเด็นนี้
          </p>
        ) : (
          <>
            <KindSummary items={items} now={now} />

            {kinds.map((k) => {
              const list = items.filter((i) => sourceKind(i.festival.type) === k);
              return (
                <section key={k} className="space-y-2">
                  <h2 className="font-bold text-slate-800">
                    {KIND_META[k].icon} {KIND_META[k].label}
                    <span className="ml-2 text-sm font-normal text-slate-500">{list.length} เรื่อง</span>
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    {list.map((item) => (
                      <ItemRow key={item.id} item={item} agencyNames={agencyNames} now={now} />
                    ))}
                  </div>
                </section>
              );
            })}

            {agencies.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-bold text-slate-800">หน่วยงานที่เกี่ยวข้อง</h2>
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                          <th className="px-4 py-2.5">หน่วยงาน</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">รับผิดชอบ</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">เสร็จ</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">กำลังทำ</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">ยังไม่รายงาน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agencies.map((a) => (
                          <tr key={a.name}>
                            <td className="min-w-[12rem] px-4 py-2.5 text-slate-800">{a.name}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{a.total}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{a.done}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">{a.active}</td>
                            <td className={`px-3 py-2.5 text-right tabular-nums ${a.silent ? "font-semibold text-red-600" : "text-slate-400"}`}>
                              {a.silent}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
