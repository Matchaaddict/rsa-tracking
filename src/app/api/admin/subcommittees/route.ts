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

  const subcommittees = await prisma.subCommittee.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { agencies: true, proposals: true } } },
  });
  return NextResponse.json(subcommittees);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description } = body;
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const sub = await prisma.subCommittee.create({
    data: { name, description },
  });
  return NextResponse.json(sub);
}
