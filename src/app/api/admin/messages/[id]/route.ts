import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { answer } = await req.json();
  const msg = await prisma.agencyMessage.update({ where: { id }, data: { answer, readByAdmin: true } });
  return NextResponse.json(msg);
}
