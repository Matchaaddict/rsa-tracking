import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 30;
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const config = await prisma.siteConfig.findUnique({ where: { key: "first_time_login_enabled" } });
  if (config?.value !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  }

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

  const { id } = await params;
  const agency = await prisma.agency.findUnique({
    where: { id },
    select: { name: true, username: true, plainPassword: true, passwordChangedByAgency: true },
  });

  if (!agency) return NextResponse.json({ error: "ไม่พบหน่วยงาน" }, { status: 404 });

  if (agency.passwordChangedByAgency) {
    return NextResponse.json({
      name: agency.name,
      changed: true,
    });
  }

  if (!agency.plainPassword) {
    return NextResponse.json({
      name: agency.name,
      changed: false,
      noPassword: true,
    });
  }

  return NextResponse.json({
    name: agency.name,
    username: agency.username,
    password: agency.plainPassword,
    changed: false,
  });
}
