import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireSuper() {
  const session = await auth();
  if (!session || session.user.role !== "admin" || !session.user.isSuperAdmin) return null;
  return session;
}

export async function GET() {
  if (!await requireSuper()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, isSuperAdmin: true, permissions: true, createdAt: true },
  });
  return NextResponse.json(admins);
}

export async function POST(req: NextRequest) {
  if (!await requireSuper()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { username, password, permissions } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "Username นี้มีอยู่แล้ว" }, { status: 400 });
  const hashed = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: { username, password: hashed, isSuperAdmin: false, permissions: JSON.stringify(permissions ?? []) },
    select: { id: true, username: true, isSuperAdmin: true, permissions: true, createdAt: true },
  });
  return NextResponse.json(admin);
}
