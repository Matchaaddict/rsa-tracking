import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaff } from "@/lib/staff";
import { IMAGE_SLOTS, imageUrl } from "@/lib/siteImageSlots";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
const MAX_BYTES = 10 * 1024 * 1024;

async function requireAdmin() {
  const staff = await getStaff();
  return staff?.kind === "admin" ? staff : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.siteImage.findMany({ select: { key: true, width: true, height: true, updatedAt: true, mime: true } });
  return NextResponse.json(
    rows.map((r) => ({ ...r, url: imageUrl(r.key, r.updatedAt.getTime()) }))
  );
}

// อัปโหลด: ย่อให้ไม่เกินขนาดของช่อง แล้วแปลงเป็น WebP (รักษาพื้นหลังโปร่งใส) เพื่อให้หน้าเว็บโหลดเร็ว
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const key = String(form.get("key") ?? "");
  const file = form.get("file");
  const slot = IMAGE_SLOTS.find((s) => s.key === key);
  if (!slot) return NextResponse.json({ error: "ไม่รู้จักช่องรูปนี้" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "กรุณาเลือกไฟล์รูป" }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะไฟล์ PNG, JPG, WebP หรือ AVIF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 10 MB" }, { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  let data: Buffer = input;
  let mime = file.type;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(input)
      .rotate()
      .resize({ width: slot.maxW, height: slot.maxH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    data = out.data;
    mime = "image/webp";
    width = out.info.width;
    height = out.info.height;
  } catch {
    // ย่อรูปไม่ได้ (เช่น sharp ไม่มีบนเครื่อง) — เก็บไฟล์เดิม ถ้าไม่ใหญ่เกินไป
    if (input.length > 3 * 1024 * 1024) {
      return NextResponse.json({ error: "ย่อรูปไม่สำเร็จ และไฟล์ใหญ่เกิน 3 MB — กรุณาย่อรูปก่อนอัปโหลด" }, { status: 400 });
    }
  }

  const saved = await prisma.siteImage.upsert({
    where: { key },
    update: { data: new Uint8Array(data), mime, width, height },
    create: { key, data: new Uint8Array(data), mime, width, height },
    select: { key: true, width: true, height: true, updatedAt: true, mime: true },
  });
  return NextResponse.json({ ...saved, bytes: data.length, url: imageUrl(key, saved.updatedAt.getTime()) });
}

// ลบ = กลับไปใช้ภาพเริ่มต้นของระบบ
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key") ?? "";
  await prisma.siteImage.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
