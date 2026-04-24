import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [festivals, proposals, agencies, implementations, subCommittees] = await Promise.all([
    prisma.festival.findMany({ orderBy: [{ year: "desc" }, { type: "asc" }] }),
    prisma.proposal.findMany({
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        implementations: {
          include: { agency: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.agency.findMany({
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
    prisma.implementation.findMany(),
    prisma.subCommittee.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalAgencies = agencies.length;
  const agenciesWithData = new Set(implementations.filter((i) => i.content).map((i) => i.agencyId)).size;
  const completed = implementations.filter((i) => i.status === "COMPLETED").length;
  const inProgress = implementations.filter((i) => i.status === "IN_PROGRESS").length;
  const notStarted = implementations.filter((i) => i.status === "NOT_STARTED").length;

  return NextResponse.json({
    festivals,
    proposals,
    agencies,
    subCommittees,
    stats: {
      totalAgencies,
      agenciesWithData,
      totalProposals: proposals.length,
      completed,
      inProgress,
      notStarted,
      totalImplementations: implementations.length,
    },
  });
}
