import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const proposalWhere = festivalId ? { festivalId } : {};

  let csv = "";

  if (type === "summary") {
    const agencies = await prisma.agency.findMany({
      where: { isVisible: true },
      orderBy: { name: "asc" },
      include: {
        subCommittees: { include: { subCommittee: true } },
        implementations: festivalId
          ? { where: { proposal: { festivalId } } }
          : true,
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
            progressEntries: true,
          },
        },
      },
    });
    csv = buildHistoryCsv(proposals);
  } else {
    const proposals = await prisma.proposal.findMany({
      where: proposalWhere,
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        implementations: {
          where: { agency: { isVisible: true } },
          include: { agency: { select: { name: true } } },
        },
      },
    });
    csv = buildDetailCsv(proposals);
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
