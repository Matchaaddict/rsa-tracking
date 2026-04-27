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
        include: {
          progressEntries: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  return NextResponse.json({ agency, proposals });
}

// PUT updates only the per-implementation metadata (contact info, evidence URL).
// Progress entries are managed via /api/agency/progress.
export async function PUT(req: NextRequest) {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = session.user.id!;
  const body = await req.json();
  const { proposalId, evidenceUrl, contactName, contactTitle, contactPhone } = body;

  const existing = await prisma.implementation.findUnique({
    where: { proposalId_agencyId: { proposalId, agencyId } },
    select: { id: true },
  });

  const isEmpty =
    !evidenceUrl?.trim() &&
    !contactName?.trim() &&
    !contactTitle?.trim() &&
    !contactPhone?.trim();

  if (isEmpty && !existing) {
    return NextResponse.json({ skipped: true });
  }

  const impl = await prisma.implementation.upsert({
    where: { proposalId_agencyId: { proposalId, agencyId } },
    update: { evidenceUrl, contactName, contactTitle, contactPhone },
    create: {
      proposalId,
      agencyId,
      evidenceUrl,
      contactName,
      contactTitle,
      contactPhone,
    },
  });

  return NextResponse.json(impl);
}
