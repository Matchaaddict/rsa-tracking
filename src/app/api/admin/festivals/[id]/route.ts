import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageSource, getStaff } from "@/lib/staff";
import { parseSourceInput } from "@/lib/sourceInput";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canManageSource(staff, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseSourceInput(await req.json(), staff);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const clash = await prisma.festival.findFirst({ where: { name: parsed.data.name, NOT: { id } } });
  if (clash) return NextResponse.json({ error: "ชื่อนี้มีอยู่แล้ว" }, { status: 400 });

  const festival = await prisma.festival.update({ where: { id }, data: parsed.data });
  return NextResponse.json(festival);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canManageSource(staff, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.festival.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
