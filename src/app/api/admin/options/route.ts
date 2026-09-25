import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";

// ตัวเลือกสำหรับฟอร์ม (อนุฯ/หน่วยงาน) — ส่งเฉพาะชื่อ ไม่มีข้อมูลบัญชี จึงเปิดให้เลขาฯ อนุฯ ใช้ได้
export async function GET() {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [subCommittees, agencies] = await Promise.all([
    prisma.subCommittee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.agency.findMany({
      where: { isVisible: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, subCommittees: { select: { subCommitteeId: true } } },
    }),
  ]);
  return NextResponse.json({
    subCommittees,
    agencies: agencies.map((a) => ({
      id: a.id,
      name: a.name,
      subCommitteeIds: a.subCommittees.map((s) => s.subCommitteeId),
    })),
  });
}
