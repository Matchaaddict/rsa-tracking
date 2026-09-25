import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // นับเฉพาะคำถามจากหน่วยงานที่ยังไม่ตอบ — ประกาศที่แอดมินส่ง (FROM_ADMIN) ไม่มีคำตอบ จึงต้องไม่นับ
  // ให้ตรงกับ "รอตอบกลับ" ในหน้าข้อความ
  const count = await prisma.agencyMessage.count({
    where: { answer: null, direction: { not: "FROM_ADMIN" } },
  });
  return NextResponse.json({ count });
}
