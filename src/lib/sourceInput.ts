import { SECRETARY_SOURCE_TYPES } from "@/lib/tracking";
import type { Staff } from "@/lib/staff";

const ALL_TYPES = ["NEW_YEAR", "SONGKRAN", "CABINET", "MEETING", "PROJECT"];

// แปลง body ของฟอร์ม "ที่มา" ให้เป็นข้อมูลที่บันทึกได้ — เลขาฯ ถูกบังคับให้เป็นการประชุม/โครงการของอนุฯ ตัวเอง
export function parseSourceInput(body: Record<string, unknown>, staff: Staff) {
  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "");
  const year = parseInt(String(body.year ?? ""), 10);
  if (!name || !ALL_TYPES.includes(type) || !Number.isFinite(year)) {
    return { error: "ข้อมูลไม่ครบหรือไม่ถูกต้อง" } as const;
  }
  if (staff.kind === "secretary" && !SECRETARY_SOURCE_TYPES.includes(type)) {
    return { error: "เลขาฯ อนุกรรมการสร้างได้เฉพาะการประชุมหรือโครงการเฉพาะ" } as const;
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const dateStr = str(body.date);
  const date = dateStr ? new Date(dateStr) : null;
  return {
    data: {
      name,
      type,
      year,
      subCommitteeId: staff.kind === "secretary" ? staff.subCommitteeId : str(body.subCommitteeId),
      meetingNo: str(body.meetingNo),
      date: date && !isNaN(date.getTime()) ? date : null,
      docUrl: str(body.docUrl),
      description: str(body.description),
      isPublic: body.isPublic !== false,
    },
  } as const;
}
