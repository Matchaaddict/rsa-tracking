// ส่วนงานในกองบูรณาการความปลอดภัยทางถนน (ผอ.ส่วน) — ใช้เป็นป้ายผู้บันทึกความเคลื่อนไหว
export const DIVISIONS = {
  DATA: "ผอ.ส่วนข้อมูลฯ",
  POLICY: "ผอ.ส่วนนโยบายฯ",
  COORD: "ผอ.ส่วนประสานฯ",
} as const;

export type Division = keyof typeof DIVISIONS;

export const SECRETARIAT = "ฝ่ายเลขานุการฯ ปภ.";

export function isDivision(v: unknown): v is Division {
  return typeof v === "string" && v in DIVISIONS;
}

// "ฝ่ายเลขานุการฯ ปภ. (ผอ.ส่วนข้อมูลฯ)" หรือ "ฝ่ายเลขานุการฯ ปภ." สำหรับแอดมินที่ไม่ได้สังกัดส่วน
export function noteAuthorLabel(division: string | null | undefined) {
  return isDivision(division) ? `${SECRETARIAT} (${DIVISIONS[division]})` : SECRETARIAT;
}
