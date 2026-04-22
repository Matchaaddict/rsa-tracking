import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { proposalId, agencyId, content, status } = body;

  const impl = await prisma.implementation.upsert({
    where: { proposalId_agencyId: { proposalId, agencyId } },
    update: { content, status },
    create: { proposalId, agencyId, content, status },
  });
  return NextResponse.json(impl);
}
