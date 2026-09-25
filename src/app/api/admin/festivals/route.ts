import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";
import { parseSourceInput } from "@/lib/sourceInput";

export async function GET() {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const festivals = await prisma.festival.findMany({
    where: staff.kind === "secretary" ? { subCommitteeId: staff.subCommitteeId } : {},
    orderBy: [{ year: "desc" }, { date: "desc" }, { type: "asc" }],
    include: {
      subCommittee: { select: { id: true, name: true } },
      _count: { select: { proposals: true } },
    },
  });
  return NextResponse.json(festivals);
}

export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = parseSourceInput(await req.json(), staff);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const exists = await prisma.festival.findUnique({ where: { name: parsed.data.name } });
  if (exists) return NextResponse.json({ error: "ชื่อนี้มีอยู่แล้ว" }, { status: 400 });

  const festival = await prisma.festival.create({ data: parsed.data });
  return NextResponse.json(festival);
}
