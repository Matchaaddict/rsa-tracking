import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, festivalId, orderNumber, subCommitteeIds } = body;

  await prisma.proposalSubCommittee.deleteMany({ where: { proposalId: id } });

  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      title,
      description,
      festivalId,
      orderNumber: parseInt(orderNumber),
      subCommittees: {
        create: (subCommitteeIds || []).map((scId: string) => ({ subCommitteeId: scId })),
      },
    },
    include: {
      festival: true,
      subCommittees: { include: { subCommittee: true } },
    },
  });
  return NextResponse.json(proposal);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
