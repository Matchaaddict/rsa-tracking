import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proposals = await prisma.proposal.findMany({
    orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
    include: {
      festival: true,
      subCommittees: { include: { subCommittee: true } },
      _count: { select: { implementations: true } },
    },
  });
  return NextResponse.json(proposals);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, festivalId, orderNumber, subCommitteeIds } = body;

  if (!title || !festivalId || !orderNumber) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const proposal = await prisma.proposal.create({
    data: {
      title,
      description,
      festivalId,
      orderNumber: parseInt(orderNumber),
      subCommittees: {
        create: (subCommitteeIds || []).map((id: string) => ({ subCommitteeId: id })),
      },
    },
    include: {
      festival: true,
      subCommittees: { include: { subCommittee: true } },
    },
  });
  return NextResponse.json(proposal);
}
