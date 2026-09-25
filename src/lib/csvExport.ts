import { STATUS_LABELS } from "./utils";
import { expectedAgencyIdsFor, sourceLabel } from "./tracking";

const BOM = "﻿";

export function csvEscape(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  return `"${String(v).replace(/"/g, '""')}"`;
}


function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function thaiDate(d: Date): string {
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ---- types matching prisma include shapes ----

export interface DetailProposal {
  orderNumber: number;
  title: string;
  festival: { type: string; name: string; year: number };
  subCommittees: { subCommittee: { name: string } }[];
  implementations: {
    status: string;
    content: string | null;
    evidenceUrl?: string | null;
    contactName?: string | null;
    contactTitle?: string | null;
    contactPhone?: string | null;
    updatedAt: Date;
    agency: { name: string };
  }[];
}

// includePrivate = false สำหรับไฟล์ที่ดาวน์โหลดจากหน้าสาธารณะ —
// ไม่มีชื่อ/ตำแหน่ง/เบอร์ผู้รายงาน และไม่มีลิงก์หลักฐาน (เห็นได้เฉพาะแอดมิน/เลขาฯ อนุฯ/หน่วยงานเจ้าของรายงาน)
export function buildDetailCsv(proposals: DetailProposal[], { includePrivate = true } = {}): string {
  let csv = BOM + [
    "ที่มา", "ปี", "อนุกรรมการ", "ข้อที่", "ชื่อข้อเสนอ",
    "หน่วยงาน", "สถานะ", "รายละเอียดล่าสุด",
    ...(includePrivate ? ["ผู้รายงาน", "ตำแหน่ง", "เบอร์", "ลิงก์หลักฐาน"] : []),
    "วันที่อัพเดต",
  ].join(",") + "\n";

  for (const p of proposals) {
    const fest = sourceLabel(p.festival);
    const yr = String(p.festival.year);
    const scs = p.subCommittees.map((s) => s.subCommittee.name).join("; ");
    if (p.implementations.length === 0) {
      csv += [
        csvEscape(fest), yr, csvEscape(scs), p.orderNumber, csvEscape(p.title),
        csvEscape("(ยังไม่มีหน่วยงาน)"), "", "",
        ...(includePrivate ? ["", "", "", ""] : []),
        "",
      ].join(",") + "\n";
      continue;
    }
    for (const impl of p.implementations) {
      csv += [
        csvEscape(fest), yr, csvEscape(scs), p.orderNumber, csvEscape(p.title),
        csvEscape(impl.agency.name), csvEscape(statusLabel(impl.status)),
        csvEscape(impl.content),
        ...(includePrivate
          ? [
              csvEscape(impl.contactName), csvEscape(impl.contactTitle), csvEscape(impl.contactPhone),
              csvEscape(impl.evidenceUrl),
            ]
          : []),
        csvEscape(thaiDate(impl.updatedAt)),
      ].join(",") + "\n";
    }
  }
  return csv;
}

export interface SummaryAgency {
  name: string;
  subCommittees: { subCommittee: { name: string } }[];
  implementations: { status: string }[];
}

export function buildSummaryCsv(agencies: SummaryAgency[]): string {
  let csv = BOM + [
    "หน่วยงาน", "อนุกรรมการ",
    "ดำเนินการแล้ว", "กำลังดำเนินการ", "ยังไม่เริ่ม", "ไม่เกี่ยวข้อง", "รวม",
    "%ดำเนินการแล้ว", "%เสร็จสมบูรณ์",
  ].join(",") + "\n";

  for (const a of agencies) {
    const scNames = a.subCommittees.map((s) => s.subCommittee.name).join("; ");
    const done = a.implementations.filter((i) => i.status === "COMPLETED").length;
    const prog = a.implementations.filter((i) => i.status === "IN_PROGRESS").length;
    const none = a.implementations.filter((i) => i.status === "NOT_STARTED").length;
    const nr = a.implementations.filter((i) => i.status === "NOT_RELEVANT").length;
    const total = done + prog + none;
    const activePct = total > 0 ? Math.round(((done + prog) / total) * 100) : 0;
    const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
    csv += [
      csvEscape(a.name), csvEscape(scNames),
      done, prog, none, nr, total,
      `${activePct}%`, `${donePct}%`,
    ].join(",") + "\n";
  }
  return csv;
}

export interface PendingProposal {
  orderNumber: number;
  title: string;
  festival: { type: string; name: string; year: number };
  subCommittees: { subCommittee: { id: string; name: string } }[];
  assignees: { agencyId: string }[];
  implementations: { agencyId: string; status: string }[];
}
export interface PendingAgency {
  id: string;
  name: string;
  subCommittees: { subCommittee: { id: string } }[];
}

// One row per (proposal × agency) where the agency is expected (assignees, else SC overlap)
// but has either no implementation row or is still NOT_STARTED.
export function buildPendingCsv(proposals: PendingProposal[], agencies: PendingAgency[]): string {
  let csv = BOM + [
    "ที่มา", "ปี", "อนุกรรมการ", "ข้อที่", "ชื่อข้อเสนอ", "หน่วยงานที่ยังไม่รายงาน",
  ].join(",") + "\n";

  const scope = agencies.map((a) => ({
    id: a.id,
    subCommitteeIds: new Set(a.subCommittees.map((s) => s.subCommittee.id)),
  }));
  for (const p of proposals) {
    const fest = sourceLabel(p.festival);
    const yr = String(p.festival.year);
    const expected = new Set(
      expectedAgencyIdsFor(
        { assignees: p.assignees, subCommittees: p.subCommittees.map((s) => ({ subCommitteeId: s.subCommittee.id })) },
        scope
      )
    );
    const reportedAgencyIds = new Set(
      p.implementations.filter((i) => i.status !== "NOT_STARTED").map((i) => i.agencyId)
    );
    const scNames = p.subCommittees.map((s) => s.subCommittee.name).join("; ");

    for (const a of agencies) {
      if (!expected.has(a.id)) continue;
      if (reportedAgencyIds.has(a.id)) continue;
      csv += [
        csvEscape(fest), yr, csvEscape(scNames), p.orderNumber, csvEscape(p.title),
        csvEscape(a.name),
      ].join(",") + "\n";
    }
  }
  return csv;
}

export interface HistoryProposal {
  orderNumber: number;
  title: string;
  festival: { type: string; name: string; year: number };
  implementations: {
    agency: { name: string };
    progressEntries: {
      status: string;
      content: string;
      reportedBy?: string | null;
      contactName?: string;
      contactTitle?: string;
      contactPhone?: string;
      createdAt: Date;
    }[];
  }[];
}

// Every progress entry as a row — full audit trail for sub-committee meetings.
// includePrivate = false (หน้าสาธารณะ): แทนข้อมูลผู้รายงานด้วย "หน่วยงาน" หรือป้ายเลขาฯ ที่บันทึกให้
export function buildHistoryCsv(proposals: HistoryProposal[], { includePrivate = true } = {}): string {
  let csv = BOM + [
    "ที่มา", "ปี", "ข้อที่", "ชื่อข้อเสนอ", "หน่วยงาน",
    "วันที่รายงาน", "สถานะ", "รายละเอียด",
    ...(includePrivate ? ["ผู้รายงาน", "ตำแหน่ง", "เบอร์"] : ["บันทึกโดย"]),
  ].join(",") + "\n";

  for (const p of proposals) {
    const fest = sourceLabel(p.festival);
    const yr = String(p.festival.year);
    for (const impl of p.implementations) {
      // Oldest first so meeting attendees can read the timeline top-down
      const sorted = [...impl.progressEntries].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      for (const e of sorted) {
        csv += [
          csvEscape(fest), yr, p.orderNumber, csvEscape(p.title),
          csvEscape(impl.agency.name),
          csvEscape(thaiDate(e.createdAt)), csvEscape(statusLabel(e.status)),
          csvEscape(e.content),
          ...(includePrivate
            ? [csvEscape(e.contactName), csvEscape(e.contactTitle), csvEscape(e.contactPhone)]
            : [csvEscape(e.reportedBy ? `${e.contactTitle ?? "เจ้าหน้าที่"} (บันทึกให้)` : "หน่วยงาน")]),
        ].join(",") + "\n";
      }
    }
  }
  return csv;
}
