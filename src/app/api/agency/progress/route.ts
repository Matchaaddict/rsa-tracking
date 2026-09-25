import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { agencyProposalWhere } from "@/lib/tracking";

async function requireAgency() {
  const session = await auth();
  if (!session || session.user.role !== "agency") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = session.user.id!;
  const { proposalId, content, status, contactName, contactTitle, contactPhone } = await req.json();

  if (!proposalId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!content?.trim() && status !== "NOT_RELEVANT") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (!contactName?.trim() || !contactTitle?.trim() || !contactPhone?.trim()) {
    return NextResponse.json({ error: "Reporter contact required" }, { status: 400 });
  }

  // รายงานได้เฉพาะเรื่องที่หน่วยงานนี้รับผิดชอบ
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { subCommittees: { select: { subCommitteeId: true } } },
  });
  const inScope = await prisma.proposal.count({
    where: {
      id: proposalId,
      ...agencyProposalWhere(agencyId, agency?.subCommittees.map((s) => s.subCommitteeId) ?? []),
    },
  });
  if (!inScope) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = await prisma.$transaction(async (tx) => {
    const impl = await tx.implementation.upsert({
      where: { proposalId_agencyId: { proposalId, agencyId } },
      update: {
        content: content ?? "",
        status,
        contactName,
        contactTitle,
        contactPhone,
      },
      create: {
        proposalId,
        agencyId,
        content: content ?? "",
        status,
        contactName,
        contactTitle,
        contactPhone,
      },
    });

    return await tx.progressEntry.create({
      data: {
        implementationId: impl.id,
        content: content ?? "",
        status,
        contactName: contactName.trim(),
        contactTitle: contactTitle.trim(),
        contactPhone: contactPhone.trim(),
      },
    });
  });

  return NextResponse.json(entry);
}
