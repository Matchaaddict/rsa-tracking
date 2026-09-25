import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";
import { parseProposalInput } from "@/lib/proposalInput";

export async function GET() {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proposals = await prisma.proposal.findMany({
    where: staff.kind === "secretary" ? { festival: { subCommitteeId: staff.subCommitteeId } } : {},
    orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
    include: {
      festival: true,
      subCommittees: { include: { subCommittee: true } },
      assignees: { include: { agency: { select: { id: true, name: true } } } },
      implementations: { select: { agencyId: true, status: true, content: true } },
      _count: { select: { implementations: true } },
    },
  });
  return NextResponse.json(proposals);
}

export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseProposalInput(await req.json(), staff);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const proposal = await prisma.proposal.create({
    data: {
      ...parsed.data,
      subCommittees: { create: parsed.subCommitteeIds.map((id) => ({ subCommitteeId: id })) },
      assignees: { create: parsed.assigneeIds.map((id) => ({ agencyId: id })) },
    },
    include: {
      festival: true,
      subCommittees: { include: { subCommittee: true } },
      assignees: { include: { agency: { select: { id: true, name: true } } } },
    },
  });
  return NextResponse.json(proposal);
}
