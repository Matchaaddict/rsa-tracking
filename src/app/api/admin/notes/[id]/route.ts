import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";

// แก้/ลบได้เฉพาะผู้บันทึกเอง หรือ Super admin
async function canEdit(noteId: string) {
  const staff = await getStaff();
  if (staff?.kind !== "admin") return { ok: false, status: 401 } as const;
  const [note, me] = await Promise.all([
    prisma.itemNote.findUnique({ where: { id: noteId }, select: { authorId: true } }),
    prisma.admin.findUnique({ where: { id: staff.id }, select: { isSuperAdmin: true } }),
  ]);
  if (!note) return { ok: false, status: 404 } as const;
  if (note.authorId !== staff.id && !me?.isSuperAdmin) return { ok: false, status: 403 } as const;
  return { ok: true } as const;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await canEdit(id);
  if (!check.ok) return NextResponse.json({ error: "Forbidden" }, { status: check.status });

  const body = await req.json();
  const content = String(body.content ?? "").trim();
  const sourceUrl = String(body.sourceUrl ?? "").trim();
  if (!content) return NextResponse.json({ error: "กรุณากรอกรายละเอียด" }, { status: 400 });
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    return NextResponse.json({ error: "ลิงก์แหล่งข้อมูลต้องขึ้นต้นด้วย https://" }, { status: 400 });
  }
  const note = await prisma.itemNote.update({ where: { id }, data: { content, sourceUrl: sourceUrl || null } });
  return NextResponse.json(note);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await canEdit(id);
  if (!check.ok) return NextResponse.json({ error: "Forbidden" }, { status: check.status });
  await prisma.itemNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
