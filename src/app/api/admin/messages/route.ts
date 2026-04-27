import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const messages = await prisma.agencyMessage.findMany({
    include: { agency: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(messages);
}

// Admin sends an announcement to one or more agencies. Each target gets
// its own row so per-agency read state stays independent.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { agencyIds, body } = (await req.json()) as { agencyIds?: string[]; body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "กรุณากรอกข้อความ" }, { status: 400 });
  if (!agencyIds?.length) return NextResponse.json({ error: "กรุณาเลือกหน่วยงาน" }, { status: 400 });

  await prisma.agencyMessage.createMany({
    data: agencyIds.map((agencyId) => ({
      agencyId,
      question: body.trim(),
      direction: "FROM_ADMIN",
      readByAdmin: true,
    })),
  });

  return NextResponse.json({ ok: true, count: agencyIds.length });
}
