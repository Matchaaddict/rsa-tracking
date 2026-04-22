import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const festivals = await prisma.festival.findMany({
    orderBy: [{ year: "desc" }, { type: "asc" }],
    include: { _count: { select: { proposals: true } } },
  });
  return NextResponse.json(festivals);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, type, year } = body;
  if (!name || !type || !year) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const festival = await prisma.festival.create({
    data: { name, type, year: parseInt(year) },
  });
  return NextResponse.json(festival);
}
