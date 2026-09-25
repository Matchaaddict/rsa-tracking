import { prisma } from "@/lib/prisma";
import { canManageSource, type Staff } from "@/lib/staff";

export function normalizeTagName(raw: string) {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

// แปลง body ฟอร์มเรื่องที่ติดตาม; เลขาฯ ผูกกับอนุฯ ตัวเองเสมอ และต้องอยู่ใต้ที่มาของอนุฯ ตัวเอง
export async function parseProposalInput(body: Record<string, unknown>, staff: Staff) {
  const title = String(body.title ?? "").trim();
  const festivalId = String(body.festivalId ?? "");
  const orderNumber = parseInt(String(body.orderNumber ?? ""), 10);
  if (!title || !festivalId || !Number.isFinite(orderNumber)) {
    return { error: "ข้อมูลไม่ครบ", status: 400 } as const;
  }
  if (!(await canManageSource(staff, festivalId))) {
    return { error: "ไม่มีสิทธิ์เพิ่มเรื่องในที่มานี้", status: 403 } as const;
  }

  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  let subCommitteeIds = staff.kind === "secretary" ? [staff.subCommitteeId] : ids(body.subCommitteeIds);
  // ไม่ได้เลือกอนุฯ แต่ที่มามีอนุฯ เจ้าของ (เช่น การประชุมของอนุฯ 1) → ผูกกับอนุฯ เจ้าของให้อัตโนมัติ
  if (subCommitteeIds.length === 0) {
    const source = await prisma.festival.findUnique({ where: { id: festivalId }, select: { subCommitteeId: true } });
    if (source?.subCommitteeId) subCommitteeIds = [source.subCommitteeId];
  }
  // เก็บเฉพาะหน่วยงานที่มีอยู่จริง
  const requested = ids(body.assigneeIds);
  const assigneeIds = requested.length
    ? (await prisma.agency.findMany({ where: { id: { in: requested } }, select: { id: true } })).map((a) => a.id)
    : [];
  // ไม่มีทั้งอนุฯ และรายชื่อหน่วยงาน = ไม่มีใครต้องรายงาน เรื่องนี้จะไม่มีวันคืบหน้า
  if (subCommitteeIds.length === 0 && assigneeIds.length === 0) {
    return { error: "กรุณาเลือกอนุกรรมการที่รับผิดชอบ หรือระบุหน่วยงานอย่างน้อย 1 หน่วย", status: 400 } as const;
  }

  // ประเด็น: รับเป็นชื่อ สร้างใหม่ถ้ายังไม่มี (เลขาฯ สร้างได้ แอดมินแก้/ลบได้ที่แท็บประเด็น)
  const tagNames = [...new Set(ids(body.tagNames).map(normalizeTagName).filter(Boolean))].slice(0, 8);
  const tagIds: string[] = [];
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
    tagIds.push(tag.id);
  }

  const dueStr = typeof body.dueDate === "string" ? body.dueDate.trim() : "";
  const due = dueStr ? new Date(dueStr) : null;

  return {
    data: {
      title,
      description: typeof body.description === "string" ? body.description : null,
      festivalId,
      orderNumber,
      dueDate: due && !isNaN(due.getTime()) ? due : null,
    },
    subCommitteeIds,
    assigneeIds,
    tagIds,
  } as const;
}
