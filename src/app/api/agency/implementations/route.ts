import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { agencyProposalWhere } from "@/lib/tracking";

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
    where: agencyProposalWhere(agencyId, subCommitteeIds),
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

// PUT updates evidence URL only. Contact info now lives per-entry.
export async function PUT(req: NextRequest) {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = session.user.id!;
  const { proposalId, evidenceUrl } = await req.json();
  // ลิงก์ใดก็ได้ (Facebook, Google Drive, เว็บไซต์ ฯลฯ) แต่ต้องเป็น http(s)
  if (evidenceUrl?.trim() && !/^https?:\/\/\S+$/i.test(evidenceUrl.trim())) {
    return NextResponse.json({ error: "ลิงก์หลักฐานต้องขึ้นต้นด้วย https://" }, { status: 400 });
  }

  const existing = await prisma.implementation.findUnique({
    where: { proposalId_agencyId: { proposalId, agencyId } },
    select: { id: true },
  });

  if (!evidenceUrl?.trim() && !existing) {
    return NextResponse.json({ skipped: true });
  }

  const impl = await prisma.implementation.upsert({
    where: { proposalId_agencyId: { proposalId, agencyId } },
    update: { evidenceUrl },
    create: { proposalId, agencyId, evidenceUrl },
  });

  return NextResponse.json(impl);
}
