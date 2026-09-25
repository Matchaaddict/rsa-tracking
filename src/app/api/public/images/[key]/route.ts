import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const img = await prisma.siteImage.findUnique({ where: { key } });
  if (!img) return new Response("Not found", { status: 404 });

  // มีเลขเวอร์ชัน (?v=) = URL เปลี่ยนทุกครั้งที่อัปโหลดใหม่ → cache ได้ถาวร
  const versioned = new URL(req.url).searchParams.has("v");
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
