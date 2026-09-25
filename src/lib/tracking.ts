import { FESTIVAL_TYPE_LABELS } from "./utils";

// ---- ที่มาของเรื่องที่ติดตาม ----
// ตาราง Festival เก็บ "ที่มา" ทุกประเภท; type บอกว่าเป็นเทศกาล/การประชุม/โครงการ/มติ ครม.
// การคำนวณ % แยกตามประเภท (kind) เสมอ ไม่รวมข้ามประเภท

export type SourceKind = "FESTIVAL" | "MEETING" | "PROJECT" | "CABINET";

export const SOURCE_KINDS: SourceKind[] = ["FESTIVAL", "MEETING", "PROJECT", "CABINET"];

export const KIND_META: Record<SourceKind, { label: string; icon: string; types: string[] }> = {
  FESTIVAL: { label: "เทศกาล", icon: "🎆", types: ["NEW_YEAR", "SONGKRAN"] },
  MEETING: { label: "การประชุม", icon: "🗓️", types: ["MEETING"] },
  PROJECT: { label: "โครงการเฉพาะ", icon: "🎯", types: ["PROJECT"] },
  CABINET: { label: "มติ ครม.", icon: "🏛️", types: ["CABINET"] },
};

// ประเภทที่มาที่เลขาฯ อนุกรรมการสร้างเองได้
export const SECRETARY_SOURCE_TYPES = ["MEETING", "PROJECT"];

export function sourceKind(type: string): SourceKind {
  if (type === "MEETING") return "MEETING";
  if (type === "PROJECT") return "PROJECT";
  if (type === "CABINET") return "CABINET";
  return "FESTIVAL";
}

type SourceLike = { type: string; name: string; year: number };

// ชื่อที่ใช้แสดง: เทศกาลใช้ "ปีใหม่ 2569", ประเภทอื่นใช้ชื่อที่ตั้งไว้ เช่น "ประชุมอนุฯ 3 ครั้งที่ 2/2569"
export function sourceLabel(f: SourceLike): string {
  if (sourceKind(f.type) === "FESTIVAL") return `${FESTIVAL_TYPE_LABELS[f.type] ?? f.type} ${f.year}`;
  return f.name;
}

// ---- หน่วยงานที่ต้องรายงานต่อเรื่อง ----
// มี assignees = เฉพาะรายชื่อนั้น, ไม่มี = ทุกหน่วยงานที่อยู่ในอนุฯ เดียวกับเรื่อง

type ProposalScope = {
  assignees: { agencyId: string }[];
  subCommittees: { subCommitteeId: string }[];
};

export function expectedAgencyIdsFor(
  p: ProposalScope,
  agencies: { id: string; subCommitteeIds: Set<string> }[]
): string[] {
  if (p.assignees.length > 0) {
    const assigned = new Set(p.assignees.map((a) => a.agencyId));
    return agencies.filter((a) => assigned.has(a.id)).map((a) => a.id);
  }
  const scIds = new Set(p.subCommittees.map((s) => s.subCommitteeId));
  return agencies.filter((a) => [...a.subCommitteeIds].some((id) => scIds.has(id))).map((a) => a.id);
}

// เงื่อนไข Prisma: เรื่องที่หน่วยงานนี้ต้องรายงาน
export function agencyProposalWhere(agencyId: string, subCommitteeIds: string[]) {
  return {
    OR: [
      { assignees: { some: { agencyId } } },
      {
        assignees: { none: {} },
        subCommittees: { some: { subCommitteeId: { in: subCommitteeIds } } },
      },
    ],
  };
}
