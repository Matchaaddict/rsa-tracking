import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/siteImageSlots";

// key → URL (มีเลขเวอร์ชันจากเวลาที่อัปโหลด เพื่อให้ cache ได้นานและเปลี่ยนรูปแล้วเห็นทันที)
export async function getSiteImageUrls(): Promise<Record<string, string>> {
  const rows = await prisma.siteImage.findMany({ select: { key: true, updatedAt: true } });
  return Object.fromEntries(rows.map((r) => [r.key, imageUrl(r.key, r.updatedAt.getTime())]));
}
