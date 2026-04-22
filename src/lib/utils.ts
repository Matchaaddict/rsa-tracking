import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "ยังไม่ดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "ดำเนินการแล้ว",
  NOT_RELEVANT: "ไม่เกี่ยวข้อง",
};

export const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  NOT_RELEVANT: "bg-slate-100 text-slate-500",
};

export const FESTIVAL_TYPE_LABELS: Record<string, string> = {
  NEW_YEAR: "ปีใหม่",
  SONGKRAN: "สงกรานต์",
};
