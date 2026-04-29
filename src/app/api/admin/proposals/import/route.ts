import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { festivalId, proposals } = (await req.json()) as {
    festivalId?: string;
    proposals?: { title: string; description: string; scId: string }[];
  };

  if (!festivalId || !Array.isArray(proposals) || proposals.length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const fest = await prisma.festival.findUnique({ where: { id: festivalId } });
  if (!fest) {
    return NextResponse.json({ error: "Festival not found" }, { status: 404 });
  }

  const last = await prisma.proposal.findFirst({
    where: { festivalId },
    orderBy: { orderNumber: "desc" },
  });
  let nextOrder = (last?.orderNumber ?? 0) + 1;

  // ส่ง create เป็น batch transaction รอบเดียว แทน sequential await ในลูป
  // (100 ข้อ × 50ms = 5s → เหลือ 1 round-trip)
  const ops = proposals
    .filter((p) => p.title?.trim() && p.description?.trim() && p.scId)
    .map((p) =>
      prisma.proposal.create({
        data: {
          title: p.title.trim(),
          description: p.description.trim(),
          festivalId,
          orderNumber: nextOrder++,
          subCommittees: { create: [{ subCommitteeId: p.scId }] },
        },
      })
    );

  if (ops.length === 0) return NextResponse.json({ created: 0 });

  const createdRows = await prisma.$transaction(ops);
  return NextResponse.json({ created: createdRows.length });
}
