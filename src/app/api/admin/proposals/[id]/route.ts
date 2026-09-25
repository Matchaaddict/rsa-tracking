import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageProposal, getStaff } from "@/lib/staff";
import { parseProposalInput } from "@/lib/proposalInput";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canManageProposal(staff, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseProposalInput(await req.json(), staff);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const proposal = await prisma.$transaction(async (tx) => {
    await tx.proposalSubCommittee.deleteMany({ where: { proposalId: id } });
    await tx.proposalAgency.deleteMany({ where: { proposalId: id } });
    return tx.proposal.update({
      where: { id },
      data: {
        ...parsed.data,
        subCommittees: { create: parsed.subCommitteeIds.map((scId) => ({ subCommitteeId: scId })) },
        assignees: { create: parsed.assigneeIds.map((agencyId) => ({ agencyId })) },
      },
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        assignees: { include: { agency: { select: { id: true, name: true } } } },
      },
    });
  });
  return NextResponse.json(proposal);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canManageProposal(staff, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
