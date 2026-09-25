import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KIND_META, type SourceKind } from "@/lib/tracking";
import {
  buildDetailCsv,
  buildSummaryCsv,
  buildPendingCsv,
  buildHistoryCsv,
} from "@/lib/csvExport";

const ALLOWED = new Set(["detail", "summary", "pending", "history"]);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "detail";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const festivalId = url.searchParams.get("festivalId") ?? undefined;
  const kind = url.searchParams.get("kind") as SourceKind | null;
  // เฉพาะที่มาที่เปิดเผย; กรองตามประเภท/ที่มาได้
  const festivalWhere = {
    isPublic: true,
    ...(kind && KIND_META[kind] ? { type: { in: KIND_META[kind].types } } : {}),
  };
  const proposalWhere = festivalId ? { festivalId, festival: festivalWhere } : { festival: festivalWhere };

  let csv = "";

  if (type === "summary") {
    const agencies = await prisma.agency.findMany({
      where: { isVisible: true },
      orderBy: { name: "asc" },
      include: {
        subCommittees: { include: { subCommittee: true } },
        implementations: { where: { proposal: proposalWhere } },
      },
    });
    csv = buildSummaryCsv(agencies);
  } else if (type === "pending") {
    const [proposals, agencies] = await Promise.all([
      prisma.proposal.findMany({
        where: proposalWhere,
        orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
        include: {
          festival: true,
          subCommittees: { include: { subCommittee: true } },
          assignees: { select: { agencyId: true } },
          implementations: {
            where: { agency: { isVisible: true } },
            select: { agencyId: true, status: true },
          },
        },
      }),
      prisma.agency.findMany({
        where: { isVisible: true },
        orderBy: { name: "asc" },
        include: { subCommittees: { include: { subCommittee: true } } },
      }),
    ]);
    csv = buildPendingCsv(proposals, agencies);
  } else if (type === "history") {
    const proposals = await prisma.proposal.findMany({
      where: proposalWhere,
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        implementations: {
          where: { agency: { isVisible: true } },
          include: {
            agency: { select: { name: true } },
            // ไม่อ่านชื่อ/เบอร์ผู้รายงาน — contactTitle ใช้เฉพาะทำป้ายรายการที่เลขาฯ บันทึกให้
            progressEntries: {
              select: { status: true, content: true, createdAt: true, reportedBy: true, contactTitle: true },
            },
          },
        },
      },
    });
    // contactTitle ของรายการที่หน่วยงานรายงานเอง = ตำแหน่งผู้รายงาน → ไม่ส่งต่อ
    csv = buildHistoryCsv(
      proposals.map((p) => ({
        ...p,
        implementations: p.implementations.map((i) => ({
          ...i,
          progressEntries: i.progressEntries.map((e) => ({ ...e, contactTitle: e.reportedBy ? e.contactTitle : undefined })),
        })),
      })),
      { includeContact: false }
    );
  } else {
    const proposals = await prisma.proposal.findMany({
      where: proposalWhere,
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        implementations: {
          where: { agency: { isVisible: true } },
          omit: { contactName: true, contactTitle: true, contactPhone: true },
          include: { agency: { select: { name: true } } },
        },
      },
    });
    csv = buildDetailCsv(proposals, { includeContact: false });
  }

  const date = new Date().toISOString().slice(0, 10);
  const scope = festivalId ? `${type}-วาระ` : type;
  const filename = `rsat-${scope}-${date}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
