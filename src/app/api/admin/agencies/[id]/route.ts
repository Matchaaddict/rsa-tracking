import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, username, password, subCommitteeIds } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (username !== undefined) data.username = username;
  if (password) {
    data.password = await bcrypt.hash(password, 10);
    data.plainPassword = password;
    data.resetRequested = false;
    data.passwordChangedByAgency = false;
  }

  await prisma.agencySubCommittee.deleteMany({ where: { agencyId: id } });

  const agency = await prisma.agency.update({
    where: { id },
    data: {
      ...data,
      subCommittees: {
        create: (subCommitteeIds || []).map((scId: string) => ({ subCommitteeId: scId })),
      },
    },
    select: {
      id: true, name: true, username: true, plainPassword: true,
      resetRequested: true, passwordChangedByAgency: true, createdAt: true,
      subCommittees: { include: { subCommittee: true } },
      _count: { select: { implementations: true } },
    },
  });
  return NextResponse.json(agency);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.agency.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
