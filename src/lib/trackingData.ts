import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";
import { expectedAgencyIdsFor } from "@/lib/tracking";

// ---- ใครกำลังดู: กำหนดว่าเห็นเรื่องภายในหรือไม่ ----
//  - แอดมิน: เห็นทุกที่มา
//  - เลขาฯ อนุฯ: ที่มาสาธารณะ + ที่มาภายในของอนุฯ ตัวเอง
//  - คนทั่วไป/หน่วยงาน: เฉพาะที่มาสาธารณะ (เรื่องภายในของหน่วยงานดูได้ที่แดชบอร์ดหน่วยงาน)
export type Viewer =
  | { kind: "public" }
  | { kind: "admin" }
  | { kind: "secretary"; subCommitteeId: string };

export async function getViewer(): Promise<Viewer> {
  const staff = await getStaff();
  if (staff?.kind === "admin") return { kind: "admin" };
  if (staff?.kind === "secretary") return { kind: "secretary", subCommitteeId: staff.subCommitteeId };
  return { kind: "public" };
}

export function visibleSourceWhere(viewer: Viewer) {
  if (viewer.kind === "admin") return {};
  if (viewer.kind === "secretary") {
    return { OR: [{ isPublic: true }, { subCommitteeId: viewer.subCommitteeId }] };
  }
  return { isPublic: true };
}

// ---- รายการเรื่องที่ติดตาม พร้อมหน่วยงานที่ต้องรายงาน ----
export async function loadItems(where: Record<string, unknown>, viewer: Viewer) {
  const [rows, agencies] = await Promise.all([
    prisma.proposal.findMany({
      where: { AND: [where, { festival: visibleSourceWhere(viewer) }] },
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: { select: { id: true, name: true } } } },
        assignees: { select: { agencyId: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        implementations: {
          where: { agency: { isVisible: true } },
          select: {
            agencyId: true,
            status: true,
            content: true,
            updatedAt: true,
            agency: { select: { name: true } },
            progressEntries: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { reportedBy: true, contactTitle: true },
            },
          },
        },
      },
    }),
    prisma.agency.findMany({
      where: { isVisible: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, subCommittees: { select: { subCommitteeId: true } } },
    }),
  ]);

  const scope = agencies.map((a) => ({
    id: a.id,
    subCommitteeIds: new Set(a.subCommittees.map((s) => s.subCommitteeId)),
  }));
  const agencyNames = new Map(agencies.map((a) => [a.id, a.name]));

  const items = rows.map((p) => ({ ...p, expectedAgencyIds: expectedAgencyIdsFor(p, scope) }));
  return { items, agencyNames };
}

export type TrackedItem = Awaited<ReturnType<typeof loadItems>>["items"][number];
