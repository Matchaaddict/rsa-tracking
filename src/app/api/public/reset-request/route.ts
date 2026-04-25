import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; start: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(ip, { count: 1, start: now });
    return false;
  }
  if (entry.count >= MAX_ATTEMPTS) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" },
      { status: 429 }
    );
  }

  const { username } = await req.json();
  if (!username?.trim()) return NextResponse.json({ error: "กรุณากรอก username" }, { status: 400 });

  const agency = await prisma.agency.findUnique({ where: { username } });
  if (!agency) return NextResponse.json({ error: "ไม่พบบัญชีนี้ในระบบ" }, { status: 404 });

  await prisma.agency.update({ where: { username }, data: { resetRequested: true } });
  return NextResponse.json({ ok: true });
}
