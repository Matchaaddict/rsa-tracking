import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const faqs = await prisma.fAQ.findMany({
    where: { published: true },
    orderBy: { orderNum: "asc" },
  });
  return NextResponse.json(faqs);
}
