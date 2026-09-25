import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";
import { normalizeTagName } from "@/lib/proposalInput";

// แก้ชื่อ/คำอธิบาย/ลบประเด็น — เฉพาะแอดมิน (ประเด็นใช้ร่วมกันทุกอนุฯ)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (staff?.kind !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const name = normalizeTagName(String(body.name ?? ""));
  if (!name) return NextResponse.json({ error: "กรุณาตั้งชื่อประเด็น" }, { status: 400 });

  const clash = await prisma.tag.findFirst({ where: { name, NOT: { id } } });
  if (clash) {
    // ชื่อซ้ำกับประเด็นอื่น = รวมประเด็น: ย้ายเรื่องทั้งหมดไปที่ประเด็นเดิม แล้วลบตัวนี้
    const links = await prisma.proposalTag.findMany({ where: { tagId: id } });
    await prisma.$transaction([
      ...links.map((l) =>
        prisma.proposalTag.upsert({
          where: { proposalId_tagId: { proposalId: l.proposalId, tagId: clash.id } },
          update: {},
          create: { proposalId: l.proposalId, tagId: clash.id },
        })
      ),
      prisma.tag.delete({ where: { id } }),
    ]);
    return NextResponse.json({ mergedInto: clash.id });
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      name,
      description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    },
  });
  return NextResponse.json(tag);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (staff?.kind !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
