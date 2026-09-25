import Link from "next/link";
import { CalendarClock, ExternalLink, Hash, Lock } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, cn, festIcon, festTheme } from "@/lib/utils";
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
import type { TrackedItem } from "@/lib/trackingData";

// ชิ้นส่วน UI ที่ใช้ร่วมกันในหน้าคณะกรรมการ/ประเด็น (render ฝั่ง server ได้)

export const thDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

export const scShort = (name: string) => {
  const n = name.match(/^C(\d+)/)?.[1];
  return n ? `อนุฯ ${n}` : name;
};

export function ProgressBar({ activePct, completedPct, className }: { activePct: number; completedPct: number; className?: string }) {
  return (
    <div className={cn("flex h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <div className="h-full bg-emerald-500" style={{ width: `${completedPct}%` }} />
      <div className="h-full bg-amber-400" style={{ width: `${Math.max(activePct - completedPct, 0)}%` }} />
    </div>
  );
}

const PILL: Record<ItemStatus, { cls: string; dot: string }> = {
  COMPLETED: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  IN_PROGRESS: { cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  NOT_STARTED: { cls: "bg-red-50 text-red-600 ring-red-200", dot: "bg-red-500" },
  NOT_RELEVANT: { cls: "bg-slate-50 text-slate-500 ring-slate-200", dot: "bg-slate-400" },
};

export function StatusPill({ status }: { status: ItemStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${PILL[status].cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PILL[status].dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SourceBadge({ source }: { source: TrackedItem["festival"] }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${festTheme(source.type).badge}`}>
      {festIcon(source.type)} {sourceLabel(source)}
      {!source.isPublic && <Lock size={10} className="opacity-70" aria-label="เรื่องภายใน" />}
    </span>
  );
}

export function TagChips({ tags }: { tags: TrackedItem["tags"] }) {
  if (tags.length === 0) return null;
  return (
    <>
      {tags.map(({ tag }) => (
        <Link
          key={tag.id}
          href={`/topics/${tag.id}`}
          className="inline-flex items-center whitespace-nowrap rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
        >
          <Hash size={10} />
          {tag.name}
        </Link>
      ))}
    </>
  );
}

// หน่วยงานที่ยังไม่เสร็จ (ยังไม่รายงาน หรือรายงานแต่ยังไม่เสร็จ)
export function pendingAgencies(item: TrackedItem, agencyNames: Map<string, string>) {
  const byAgency = new Map(item.implementations.map((i) => [i.agencyId, i]));
  return item.expectedAgencyIds
    .map((id) => ({ id, name: agencyNames.get(id) ?? id, status: byAgency.get(id)?.status ?? null }))
    .filter((a) => a.status !== "COMPLETED" && a.status !== "NOT_RELEVANT");
}

// แถวเรื่องที่ติดตาม — กดเพื่อดูผลรายงานรายหน่วยงาน (ใช้ <details> ไม่ต้องมี JS)
export function ItemRow({
  item,
  agencyNames,
  now,
  showSource = true,
}: {
  item: TrackedItem;
  agencyNames: Map<string, string>;
  now: number;
  showSource?: boolean;
}) {
  const s = computeProgress([item]);
  const st = itemStatus(item);
  const overdue = isOverdue(item, now);
  const reported = new Set(item.implementations.map((i) => i.agencyId));
  const silent = item.expectedAgencyIds.filter((id) => !reported.has(id));

  return (
    <details className="group border-b border-slate-100 last:border-0">
      <summary className="flex cursor-pointer list-none flex-col gap-2 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400">ข้อ {item.orderNumber}</span>
            {showSource && <SourceBadge source={item.festival} />}
            <TagChips tags={item.tags} />
            {item.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px]",
                  overdue ? "bg-red-50 font-semibold text-red-600" : "bg-slate-100 text-slate-600"
                )}
              >
                <CalendarClock size={10} />
                {overdue ? "เลยกำหนด" : "กำหนด"} {thDate(item.dueDate)}
              </span>
            )}
          </div>
          <p className="text-pretty break-words font-semibold leading-snug text-slate-800">{item.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:w-64">
          <StatusPill status={st} />
          <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="flex-1" />
          <span className="w-9 text-right text-xs tabular-nums text-slate-600">{s.activePct}%</span>
        </div>
      </summary>
      <div className="space-y-2 bg-slate-50/70 px-4 pb-4 pt-1">
        {item.description && <p className="break-words text-sm text-slate-600">{item.description}</p>}
        {item.implementations.map((impl) => (
          <div key={impl.agencyId} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{impl.agency.name}</p>
              {impl.content ? (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-600">{impl.content}</p>
              ) : (
                <p className="mt-0.5 text-sm italic text-slate-400">ยังไม่ได้กรอกข้อมูล</p>
              )}
              <p className="mt-1 text-[10px] text-slate-400">อัปเดตล่าสุด: {thDate(impl.updatedAt)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[impl.status]}`}>
              {STATUS_LABELS[impl.status]}
            </span>
          </div>
        ))}
        {silent.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="mb-1.5 text-xs font-medium text-amber-700">ยังไม่รายงาน ({silent.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {silent.map((id) => (
                <span key={id} className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs text-amber-800">
                  {agencyNames.get(id) ?? id}
                </span>
              ))}
            </div>
          </div>
        )}
        {item.expectedAgencyIds.length === 0 && (
          <p className="text-sm text-slate-400">ยังไม่มีหน่วยงานที่ต้องรายงาน</p>
        )}
      </div>
    </details>
  );
}

// การ์ดสรุปแยกตามประเภทที่มา — ไม่รวม % ข้ามประเภท
export function KindSummary({ items, now }: { items: TrackedItem[]; now: number }) {
  const kinds = SOURCE_KINDS.filter((k) => items.some((i) => sourceKind(i.festival.type) === k));
  if (kinds.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kinds.map((k: SourceKind) => {
        const list = items.filter((i) => sourceKind(i.festival.type) === k);
        const s = computeProgress(list);
        const open = list.filter((i) => ["IN_PROGRESS", "NOT_STARTED"].includes(itemStatus(i))).length;
        const late = list.filter((i) => isOverdue(i, now)).length;
        return (
          <div key={k} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              {KIND_META[k].icon} {KIND_META[k].label}
            </p>
            <div className="mt-1 flex items-end gap-2">
              <p className="text-3xl font-bold tabular-nums text-slate-900">{s.activePct}%</p>
              <p className="mb-1 text-xs text-emerald-600">เสร็จ {s.completedPct}%</p>
            </div>
            <ProgressBar activePct={s.activePct} completedPct={s.completedPct} className="mt-2" />
            <p className="mt-2 text-xs text-slate-500">
              {list.length} เรื่อง · ค้าง {open}
              {late > 0 && <span className="font-semibold text-red-600"> · เลยกำหนด {late}</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function DocLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
      เอกสาร <ExternalLink size={11} />
    </a>
  );
}
