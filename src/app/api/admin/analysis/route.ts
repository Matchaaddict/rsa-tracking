import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const festivalId = searchParams.get("festivalId");
  if (!festivalId) {
    return NextResponse.json({ error: "festivalId required" }, { status: 400 });
  }

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    include: {
      proposals: {
        include: {
          subCommittees: { include: { subCommittee: true } },
          implementations: true,
        },
        orderBy: { orderNumber: "asc" },
      },
    },
  });

  if (!festival) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const agencies = await prisma.agency.findMany({
    include: { subCommittees: true },
    orderBy: { name: "asc" },
  });

  const result = agencies
    .map((agency) => {
      const agencyScIds = new Set(agency.subCommittees.map((a) => a.subCommitteeId));

      const responsible = festival.proposals.filter((p) =>
        p.subCommittees.some((psc) => agencyScIds.has(psc.subCommitteeId))
      );

      if (responsible.length === 0) return null;

      const proposals = responsible.map((p) => {
        const impl = p.implementations.find((i) => i.agencyId === agency.id);
        const hasContent = !!(impl?.content?.trim());
        const answered = hasContent || (impl?.status && impl.status !== "NOT_STARTED");
        return {
          id: p.id,
          title: p.title,
          orderNumber: p.orderNumber,
          status: impl?.status ?? "NOT_STARTED",
          hasContent,
          answered,
          content: impl?.content ?? null,
        };
      });

      const answeredCount = proposals.filter((p) => p.answered).length;

      return {
        id: agency.id,
        name: agency.name,
        totalProposals: responsible.length,
        answered: answeredCount,
        proposals,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    festival: { id: festival.id, name: festival.name },
    agencies: result,
  });
}
