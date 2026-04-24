import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const faqs = await prisma.fAQ.findMany({ orderBy: { orderNum: "asc" } });
  return NextResponse.json(faqs);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { question, answer } = await req.json();
  const count = await prisma.fAQ.count();
  const faq = await prisma.fAQ.create({ data: { question, answer, orderNum: count } });
  return NextResponse.json(faq);
}
