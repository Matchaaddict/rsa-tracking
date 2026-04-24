import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "agency" || !session.user.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.id },
    select: { passwordChangedByAgency: true },
  });
  return NextResponse.json({ isDefaultPassword: !agency?.passwordChangedByAgency });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "agency" || !session.user.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return NextResponse.json({ error: "ข้อมูลไม่ครบหรือรหัสผ่านสั้นเกินไป" }, { status: 400 });

  const agency = await prisma.agency.findUnique({ where: { id: session.user.id } });
  if (!agency) return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, agency.password);
  if (!valid) return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.agency.update({
    where: { id: session.user.id },
    data: { password: hashed, plainPassword: null, passwordChangedByAgency: true },
  });
  return NextResponse.json({ ok: true });
}
