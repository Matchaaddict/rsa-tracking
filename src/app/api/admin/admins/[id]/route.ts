import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireSuper() {
  const session = await auth();
  if (!session || session.user.role !== "admin" || !session.user.isSuperAdmin) return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { password, permissions } = await req.json();
  const data: Record<string, unknown> = {};
  if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
  if (password) data.password = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.update({
    where: { id },
    data,
    select: { id: true, username: true, isSuperAdmin: true, permissions: true, createdAt: true },
  });
  return NextResponse.json(admin);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // Cannot delete yourself
  if (id === session.user.id) return NextResponse.json({ error: "ไม่สามารถลบตัวเองได้" }, { status: 400 });
  await prisma.admin.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
