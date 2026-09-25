import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expectedAgencyIdsFor } from "@/lib/tracking";
import { getSiteImageUrls } from "@/lib/siteImages";

export async function GET(req: NextRequest) {
  // หน้าแรกใช้ default — ไม่ต้องส่ง progressEntries มาด้วย เพราะใช้แค่ status/content ปัจจุบัน
  // หน้า ReportPage ที่ต้องการประวัติเต็มเรียกด้วย ?fullHistory=true
  const fullHistory = new URL(req.url).searchParams.get("fullHistory") === "true";

  // หน้าสาธารณะ: ไม่ส่งชื่อ/ตำแหน่ง/เบอร์โทรผู้รายงาน และลิงก์หลักฐานออกไป
  // (ลิงก์หลักฐานเห็นได้เฉพาะแอดมิน เลขาฯ อนุฯ และหน่วยงานเจ้าของรายงาน)
  const omitContact = { contactName: true, contactTitle: true, contactPhone: true, evidenceUrl: true } as const;
  // reportedBy + contactTitle ใช้ทำป้าย "เลขาฯ อนุฯ X บันทึกให้" — contactTitle ของหน่วยงานจะถูกตัดทิ้งก่อนส่ง
  const entrySelect = { reportedBy: true, contactTitle: true } as const;

  const implementationsInclude = fullHistory
    ? {
        where: { agency: { isVisible: true } },
        omit: omitContact,
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
              ...entrySelect,
            },
          },
        },
      }
    : {
        where: { agency: { isVisible: true } },
        omit: omitContact,
        include: {
          agency: { select: { id: true, name: true } },
          progressEntries: { orderBy: { createdAt: "desc" as const }, take: 1, select: entrySelect },
        },
      };

  const [festivals, proposalsRaw, agencies, subCommittees, siteConfigs] = await Promise.all([
    // หน้าสาธารณะ: เฉพาะที่มาที่เปิดเผย (isPublic) — เรื่องภายในไม่ส่งออกไปเลย
    prisma.festival.findMany({
      where: { isPublic: true },
      orderBy: [{ year: "desc" }, { date: "desc" }, { type: "asc" }],
    }),
    prisma.proposal.findMany({
      where: { festival: { isPublic: true } },
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        assignees: { select: { agencyId: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
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
          where: { proposal: { festival: { isPublic: true } } },
          omit: omitContact,
          include: { proposal: { include: { festival: true } } },
        },
      },
    }),
    prisma.subCommittee.findMany({ orderBy: { name: "asc" } }),
    prisma.siteConfig.findMany(),
  ]);

  const siteConfig: Record<string, string> = {};
  siteConfigs.forEach((c) => { siteConfig[c.key] = c.value; });

  const agencyScope = agencies.map((a) => ({
    id: a.id,
    subCommitteeIds: new Set(a.subCommittees.map((s) => s.subCommitteeId)),
  }));

  // หน่วยงานที่ต้องรายงานแต่ละเรื่อง — ยังไม่รายงานนับเป็น NOT_STARTED
  // ป้ายผู้บันทึก: เฉพาะรายการที่เลขาฯ/แอดมินหยอดให้ (staffLabel) — รายการของหน่วยงานไม่มีข้อมูลผู้รายงาน
  const proposals = proposalsRaw.map((p) => ({
    ...p,
    implementations: p.implementations.map((impl) => ({
      ...impl,
      progressEntries: impl.progressEntries.map(({ reportedBy, contactTitle, ...rest }) => ({
        ...rest,
        staffLabel: reportedBy ? contactTitle : null,
      })),
    })),
    expectedAgencyIds: expectedAgencyIdsFor(p, agencyScope),
  }));

  return NextResponse.json(
    { festivals, proposals, agencies, subCommittees, siteConfig, images: await getSiteImageUrls() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
