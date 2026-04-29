import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // หน้าแรกใช้ default — ไม่ต้องส่ง progressEntries มาด้วย เพราะใช้แค่ status/content ปัจจุบัน
  // หน้า ReportPage ที่ต้องการประวัติเต็มเรียกด้วย ?fullHistory=true
  const fullHistory = new URL(req.url).searchParams.get("fullHistory") === "true";

  const implementationsInclude = fullHistory
    ? {
        where: { agency: { isVisible: true } },
        include: {
          agency: { select: { id: true, name: true } },
          progressEntries: {
            orderBy: { createdAt: "desc" as const },
            select: {
              id: true,
              content: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }
    : {
        where: { agency: { isVisible: true } },
        include: { agency: { select: { id: true, name: true } } },
      };

  const [festivals, proposalsRaw, agencies, subCommittees, siteConfigs] = await Promise.all([
    prisma.festival.findMany({ orderBy: [{ year: "desc" }, { type: "asc" }] }),
    prisma.proposal.findMany({
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        implementations: implementationsInclude,
      },
    }),
    prisma.agency.findMany({
      where: { isVisible: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        subCommittees: { include: { subCommittee: true } },
        implementations: {
          include: { proposal: { include: { festival: true } } },
        },
      },
    }),
    prisma.subCommittee.findMany({ orderBy: { name: "asc" } }),
    prisma.siteConfig.findMany(),
  ]);

  const siteConfig: Record<string, string> = {};
  siteConfigs.forEach((c) => { siteConfig[c.key] = c.value; });

  // Each agency's sub-committee membership set
  const agencyScSets = new Map<string, Set<string>>();
  agencies.forEach((a) => {
    agencyScSets.set(a.id, new Set(a.subCommittees.map((s) => s.subCommitteeId)));
  });

  // For each proposal: agencies whose SC overlaps the proposal's SC are
  // implicitly responsible — they count as NOT_STARTED until they engage.
  const proposals = proposalsRaw.map((p) => {
    const propScIds = new Set(p.subCommittees.map((s) => s.subCommitteeId));
    const expectedAgencyIds: string[] = [];
    agencies.forEach((a) => {
      const aScs = agencyScSets.get(a.id)!;
      for (const sc of aScs) {
        if (propScIds.has(sc)) {
          expectedAgencyIds.push(a.id);
          break;
        }
      }
    });
    return { ...p, expectedAgencyIds };
  });

  return NextResponse.json(
    { festivals, proposals, agencies, subCommittees, siteConfig },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
