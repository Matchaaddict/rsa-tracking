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
  CABINET: "ตามมติ ครม.",
  MEETING: "การประชุม",
  PROJECT: "โครงการเฉพาะ",
};

export const FESTIVAL_TYPE_ICONS: Record<string, string> = {
  NEW_YEAR: "🎆",
  SONGKRAN: "💦",
  CABINET: "🏛️",
  MEETING: "🗓️",
  PROJECT: "🎯",
};

// คลาสสีต่อ type — แยกตามจุดใช้งาน เพื่อให้ ternary เก่ามี mapping ตรงตัว
export const FESTIVAL_TYPE_THEME: Record<string, {
  text: string;        // ใช้กับข้อความ เช่น text-blue-600
  bgSolid: string;     // พื้นเข้ม + ขอบ เช่น bg-blue-600 border-blue-600
  bgSoft: string;      // พื้นอ่อน + hover เช่น bg-blue-50 hover:bg-blue-100
  badge: string;       // badge แบบกลม เช่น bg-blue-50 text-blue-600
  pill: string;        // pill เข้ม เช่น bg-blue-100 text-blue-700
  badgeVariant: "default" | "success" | "warning" | "gray";
}> = {
  NEW_YEAR: {
    text: "text-blue-600",
    bgSolid: "bg-blue-600 border-blue-600",
    bgSoft: "bg-blue-50 hover:bg-blue-100",
    badge: "bg-blue-50 text-blue-600",
    pill: "bg-blue-100 text-blue-700",
    badgeVariant: "default",
  },
  SONGKRAN: {
    text: "text-orange-500",
    bgSolid: "bg-orange-500 border-orange-500",
    bgSoft: "bg-orange-50 hover:bg-orange-100",
    badge: "bg-orange-50 text-orange-600",
    pill: "bg-orange-100 text-orange-700",
    badgeVariant: "warning",
  },
  CABINET: {
    text: "text-slate-700",
    bgSolid: "bg-slate-700 border-slate-700",
    bgSoft: "bg-slate-50 hover:bg-slate-100",
    badge: "bg-slate-100 text-slate-700",
    pill: "bg-slate-100 text-slate-700",
    badgeVariant: "gray",
  },
  MEETING: {
    text: "text-violet-600",
    bgSolid: "bg-violet-600 border-violet-600",
    bgSoft: "bg-violet-50 hover:bg-violet-100",
    badge: "bg-violet-50 text-violet-700",
    pill: "bg-violet-100 text-violet-700",
    badgeVariant: "default",
  },
  PROJECT: {
    text: "text-teal-600",
    bgSolid: "bg-teal-600 border-teal-600",
    bgSoft: "bg-teal-50 hover:bg-teal-100",
    badge: "bg-teal-50 text-teal-700",
    pill: "bg-teal-100 text-teal-700",
    badgeVariant: "success",
  },
};

export function festTheme(type: string) {
  return FESTIVAL_TYPE_THEME[type] ?? FESTIVAL_TYPE_THEME.NEW_YEAR;
}

export function festIcon(type: string) {
  return FESTIVAL_TYPE_ICONS[type] ?? "📋";
}
