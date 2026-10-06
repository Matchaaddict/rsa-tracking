import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";
import { noteAuthorLabel } from "@/lib/divisions";

// บันทึกความเคลื่อนไหวจากฝ่ายเลขานุการฯ (ผอ.ส่วน/แอดมิน) — แยกจากรายงานของหน่วยงาน ไม่กระทบสถานะและ %
const URL_RE = /^https?:\/\/\S+$/i;

export async function GET(req: NextRequest) {
  const staff = await getStaff();
  if (staff?.kind !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const proposalId = new URL(req.url).searchParams.get("proposalId") ?? undefined;
  const notes = await prisma.itemNote.findMany({
    where: proposalId ? { proposalId } : {},
    orderBy: { createdAt: "desc" },
    select: { id: true, proposalId: true, content: true, sourceUrl: true, authorLabel: true, authorId: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (staff?.kind !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const proposalId = String(body.proposalId ?? "");
  const content = String(body.content ?? "").trim();
  const sourceUrl = String(body.sourceUrl ?? "").trim();
  if (!proposalId || !content) return NextResponse.json({ error: "กรุณากรอกรายละเอียด" }, { status: 400 });
  if (content.length > 4000) return NextResponse.json({ error: "ข้อความยาวเกินไป" }, { status: 400 });
  if (sourceUrl && !URL_RE.test(sourceUrl)) {
    return NextResponse.json({ error: "ลิงก์แหล่งข้อมูลต้องขึ้นต้นด้วย https://" }, { status: 400 });
  }
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, select: { id: true } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = await prisma.admin.findUnique({ where: { id: staff.id }, select: { division: true } });
  const note = await prisma.itemNote.create({
    data: {
      proposalId,
      content,
      sourceUrl: sourceUrl || null,
      authorLabel: noteAuthorLabel(admin?.division),
      authorId: staff.id,
    },
  });
  return NextResponse.json(note);
}
