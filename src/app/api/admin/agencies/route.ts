import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

const agencySelect = {
  id: true,
  name: true,
  username: true,
  createdAt: true,
  subCommittees: { include: { subCommittee: true } },
  _count: { select: { implementations: true } },
} as const;

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencies = await prisma.agency.findMany({
    orderBy: { name: "asc" },
    select: agencySelect,
  });
  return NextResponse.json(agencies);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, username, password, subCommitteeIds } = body;

  if (!name || !username || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const agency = await prisma.agency.create({
    data: {
      name,
      username,
      password: hashed,
      subCommittees: {
        create: (subCommitteeIds || []).map((id: string) => ({ subCommitteeId: id })),
      },
    },
    select: agencySelect,
  });
  return NextResponse.json(agency);
}
