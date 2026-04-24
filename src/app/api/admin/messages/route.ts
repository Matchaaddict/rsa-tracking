import { NextResponse } from "next/server";
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
