import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "agency" || !session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const messages = await prisma.agencyMessage.findMany({
    where: { agencyId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "agency" || !session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "กรุณากรอกคำถาม" }, { status: 400 });
  const msg = await prisma.agencyMessage.create({ data: { agencyId: session.user.id, question } });
  return NextResponse.json(msg);
}
