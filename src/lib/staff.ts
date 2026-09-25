import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ผู้ดูแล 2 ระดับ:
//  - admin: จัดการได้ทั้งหมด
//  - secretary (เลขาฯ อนุกรรมการ): จัดการได้เฉพาะที่มา/เรื่องของอนุฯ ตัวเอง
export type Staff =
  | { kind: "admin"; id: string }
  | { kind: "secretary"; id: string; subCommitteeId: string };

export async function getStaff(): Promise<Staff | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) return null;
  if (u.role === "admin") return { kind: "admin", id: u.id };
  if (u.role === "secretary") {
    // อ่านจาก DB ทุกครั้ง: ถ้าแอดมินถอดสิทธิ์/ย้ายอนุฯ จะมีผลทันที ไม่ต้องรอ token หมดอายุ
    const admin = await prisma.admin.findUnique({ where: { id: u.id }, select: { subCommitteeId: true } });
    if (!admin?.subCommitteeId) return null;
    return { kind: "secretary", id: u.id, subCommitteeId: admin.subCommitteeId };
  }
  return null;
}

// เลขาฯ แตะได้เฉพาะที่มาที่อนุฯ ตัวเองเป็นเจ้าของ
export async function canManageSource(staff: Staff, festivalId: string): Promise<boolean> {
  if (staff.kind === "admin") return true;
  const f = await prisma.festival.findUnique({ where: { id: festivalId }, select: { subCommitteeId: true } });
  return f?.subCommitteeId === staff.subCommitteeId;
}

export async function canManageProposal(staff: Staff, proposalId: string): Promise<boolean> {
  if (staff.kind === "admin") return true;
  const p = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { festival: { select: { subCommitteeId: true } } },
  });
  return p?.festival.subCommitteeId === staff.subCommitteeId;
}
