import Link from "next/link";
import { ChevronRight, Hash } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getShellInfo } from "@/lib/shellInfo";
import { prisma } from "@/lib/prisma";
import { getViewer, loadItems } from "@/lib/trackingData";
import { KIND_META, SOURCE_KINDS, computeProgress, currentTime, isOverdue, isUnresolved, sourceKind } from "@/lib/tracking";
import { ProgressBar } from "@/components/tracking/ItemBits";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const viewer = await getViewer();
  const [tags, { items }, info] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    loadItems({ tags: { some: {} } }, viewer),
    getShellInfo(),
  ]);
  const now = currentTime();

  // แสดงเฉพาะประเด็นที่มีเรื่องที่ผู้ดูมีสิทธิ์เห็น
  const topics = tags
    .map((t) => ({ tag: t, list: items.filter((i) => i.tags.some((x) => x.tag.id === t.id)) }))
    .filter((t) => t.list.length > 0)
    .sort((a, b) => b.list.length - a.list.length || a.tag.name.localeCompare(b.tag.name, "th"));

  return (
    <AppShell info={info}>
      <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold text-[#0b1d4d] sm:text-2xl">ประเด็นขับเคลื่อน</h1>
          <p className="mt-1 text-sm text-slate-500">
            รวมเรื่องที่ติดตามตามประเด็น เช่น ทางข้าม — ดึงมาจากทุกที่มา ทั้งข้อเสนอเทศกาล มติที่ประชุม และโครงการเฉพาะ
          </p>
        </div>

        {topics.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
            ยังไม่มีประเด็น — ติดแท็กประเด็นได้ในฟอร์มเรื่องที่ติดตามของแผงควบคุม
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map(({ tag, list }) => {
              const kinds = SOURCE_KINDS.filter((k) => list.some((i) => sourceKind(i.festival.type) === k));
              const open = list.filter(isUnresolved).length;
              const late = list.filter((i) => isOverdue(i, now)).length;
              return (
                <Link
                  key={tag.id}
                  href={`/topics/${tag.id}`}
                  className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1 text-lg font-bold text-slate-800">
                      <Hash size={18} className="shrink-0 text-blue-500" />
                      <span className="break-words">{tag.name}</span>
                    </p>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300 group-hover:text-blue-500" />
                  </div>
                  {tag.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{tag.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {list.length} เรื่อง · ค้าง {open}
                    {late > 0 && <span className="font-semibold text-red-600"> · เลยกำหนด {late}</span>}
                  </p>
                  <div className="mt-3 space-y-2">
                    {kinds.map((k) => {
                      const s = computeProgress(list.filter((i) => sourceKind(i.festival.type) === k));
                      return (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <span className="w-28 shrink-0 text-slate-600">{KIND_META[k].icon} {KIND_META[k].label}</span>
                          <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="flex-1" />
                          <span className="w-9 text-right tabular-nums text-slate-600">{s.activePct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
