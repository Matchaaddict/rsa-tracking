import { prisma } from "@/lib/prisma";
import pkg from "../../package.json";

export interface ShellInfo {
  title: string;
  subtitle: string;
  lastUpdated: string | null;
  version: string;
}

export const DEFAULT_TITLE = "ระบบติดตามข้อเสนอแนวทางป้องกันและลดอุบัติเหตุทางถนน ฯ";
export const DEFAULT_SUBTITLE =
  "โดย สำนักเลขานุการ ศปถ. - กองบูรณาการความปลอดภัยทางถนน กรมป้องกันและบรรเทาสาธารณภัย";

// ข้อมูลที่ sidebar/header ต้องใช้ — ดึงฝั่ง server เพื่อไม่ต้องยิง API เพิ่ม
export async function getShellInfo(): Promise<ShellInfo> {
  const [configs, latest] = await Promise.all([
    prisma.siteConfig.findMany({ where: { key: { in: ["hero_title", "site_org"] } } }),
    prisma.implementation.aggregate({ _max: { updatedAt: true } }),
  ]);
  const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]));
  return {
    title: cfg.hero_title || DEFAULT_TITLE,
    subtitle: cfg.site_org || DEFAULT_SUBTITLE,
    lastUpdated: latest._max.updatedAt?.toISOString() ?? null,
    version: pkg.version,
  };
}
