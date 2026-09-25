import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";
import { agencyProposalWhere } from "@/lib/tracking";

// เลขาฯ อนุฯ / แอดมิน "หยอด" ความคืบหน้าให้หน่วยงาน (เช่น เห็นจากเพจ FB ของหน่วยงาน)
//  - บันทึกเป็นรายงานหนึ่งรายการในประวัติ (reportedBy = secretary/admin) ไม่เขียนทับของหน่วยงาน
//  - ตั้งได้แค่ "กำลังดำเนินการ" — การยืนยันว่าเสร็จเป็นของหน่วยงานเท่านั้น
//  - ถ้าหน่วยงานรายงานว่าเสร็จ/ไม่เกี่ยวข้องแล้ว จะไม่ให้หยอดทับ (กันสถานะถอยหลัง)
export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const proposalId = String(body.proposalId ?? "");
  const agencyId = String(body.agencyId ?? "");
  const content = String(body.content ?? "").trim();
  const evidenceUrl = String(body.evidenceUrl ?? "").trim();
  if (!proposalId || !agencyId || !content) {
    return NextResponse.json({ error: "กรุณากรอกรายละเอียดความคืบหน้า" }, { status: 400 });
  }
  if (evidenceUrl && !/^https?:\/\/\S+$/i.test(evidenceUrl)) {
    return NextResponse.json({ error: "ลิงก์หลักฐานต้องขึ้นต้นด้วย https://" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      festival: { select: { subCommitteeId: true } },
      subCommittees: { select: { subCommitteeId: true } },
    },
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // เลขาฯ หยอดได้เฉพาะเรื่องของอนุฯ ตัวเอง (ทั้งข้อเสนอเทศกาลและมติที่ประชุม)
  if (
    staff.kind === "secretary" &&
    proposal.festival.subCommitteeId !== staff.subCommitteeId &&
    !proposal.subCommittees.some((s) => s.subCommitteeId === staff.subCommitteeId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // หน่วยงานต้องเป็นผู้รับผิดชอบเรื่องนี้
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { name: true, subCommittees: { select: { subCommitteeId: true } } },
  });
  const inScope = agency
    ? await prisma.proposal.count({
        where: { id: proposalId, ...agencyProposalWhere(agencyId, agency.subCommittees.map((s) => s.subCommitteeId)) },
      })
    : 0;
  if (!inScope) return NextResponse.json({ error: "หน่วยงานนี้ไม่ได้รับผิดชอบเรื่องนี้" }, { status: 400 });

  const existing = await prisma.implementation.findUnique({
    where: { proposalId_agencyId: { proposalId, agencyId } },
    select: { status: true, evidenceUrl: true },
  });
  if (existing?.status === "COMPLETED" || existing?.status === "NOT_RELEVANT") {
    return NextResponse.json(
      { error: `หน่วยงานรายงานว่า${existing.status === "COMPLETED" ? "ดำเนินการแล้ว" : "ไม่เกี่ยวข้อง"} — ไม่ต้องหยอดเพิ่ม` },
      { status: 409 }
    );
  }

  let reporterTitle = "ผู้ดูแลระบบ";
  if (staff.kind === "secretary") {
    const sc = await prisma.subCommittee.findUnique({ where: { id: staff.subCommitteeId }, select: { name: true } });
    const n = sc?.name.match(/^C(\d+)/)?.[1];
    reporterTitle = `เลขาฯ ${n ? `อนุฯ ${n}` : sc?.name ?? "อนุกรรมการ"}`;
  }
  const admin = await prisma.admin.findUnique({ where: { id: staff.id }, select: { username: true } });

  const entry = await prisma.$transaction(async (tx) => {
    const impl = await tx.implementation.upsert({
      where: { proposalId_agencyId: { proposalId, agencyId } },
      update: {
        content,
        status: "IN_PROGRESS",
        // หลักฐานของหน่วยงานเดิมไม่ถูกทับ
        ...(evidenceUrl && !existing?.evidenceUrl ? { evidenceUrl } : {}),
      },
      create: { proposalId, agencyId, content, status: "IN_PROGRESS", evidenceUrl: evidenceUrl || null },
    });
    return tx.progressEntry.create({
      data: {
        implementationId: impl.id,
        content,
        status: "IN_PROGRESS",
        reportedBy: staff.kind,
        evidenceUrl: evidenceUrl || null,
        contactName: admin?.username ?? "",
        contactTitle: reporterTitle,
      },
    });
  });

  return NextResponse.json(entry);
}
