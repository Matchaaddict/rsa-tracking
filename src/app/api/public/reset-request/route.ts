import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username?.trim()) return NextResponse.json({ error: "กรุณากรอก username" }, { status: 400 });

  const agency = await prisma.agency.findUnique({ where: { username } });
  if (!agency) return NextResponse.json({ error: "ไม่พบบัญชีนี้ในระบบ" }, { status: 404 });

  await prisma.agency.update({ where: { username }, data: { resetRequested: true } });
  return NextResponse.json({ ok: true });
}
