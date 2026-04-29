import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: "first_time_login_enabled" } });
  if (config?.value !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  }

  const agencies = await prisma.agency.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, passwordChangedByAgency: true },
  });
  return NextResponse.json(agencies);
}
