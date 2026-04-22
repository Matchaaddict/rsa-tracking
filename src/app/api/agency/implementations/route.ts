import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAgency() {
  const session = await auth();
  if (!session || session.user.role !== "agency") return null;
  return session;
}

export async function GET() {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = session.user.id!;
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      id: true,
      name: true,
      subCommittees: { select: { subCommitteeId: true } },
    },
  });

  if (!agency) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const subCommitteeIds = agency.subCommittees.map((s) => s.subCommitteeId);

  const proposals = await prisma.proposal.findMany({
    where: {
      subCommittees: {
        some: { subCommitteeId: { in: subCommitteeIds } },
      },
    },
    orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
    include: {
      festival: true,
      subCommittees: { include: { subCommittee: true } },
      implementations: {
        where: { agencyId },
      },
    },
  });

  return NextResponse.json({ agency, proposals });
}

export async function PUT(req: NextRequest) {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = session.user.id!;
  const body = await req.json();
  const { proposalId, content, status } = body;

  const impl = await prisma.implementation.upsert({
    where: { proposalId_agencyId: { proposalId, agencyId } },
    update: { content, status },
    create: { proposalId, agencyId, content, status },
  });
  return NextResponse.json(impl);
}
