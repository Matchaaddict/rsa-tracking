import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAgency() {
  const session = await auth();
  if (!session || session.user.role !== "agency") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = session.user.id!;
  const { proposalId, content, status, contactName, contactTitle, contactPhone } = await req.json();

  if (!proposalId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!content?.trim() && status !== "NOT_RELEVANT") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (!contactName?.trim() || !contactTitle?.trim() || !contactPhone?.trim()) {
    return NextResponse.json({ error: "Reporter contact required" }, { status: 400 });
  }

  const entry = await prisma.$transaction(async (tx) => {
    const impl = await tx.implementation.upsert({
      where: { proposalId_agencyId: { proposalId, agencyId } },
      update: {
        content: content ?? "",
        status,
        contactName,
        contactTitle,
        contactPhone,
      },
      create: {
        proposalId,
        agencyId,
        content: content ?? "",
        status,
        contactName,
        contactTitle,
        contactPhone,
      },
    });

    return await tx.progressEntry.create({
      data: {
        implementationId: impl.id,
        content: content ?? "",
        status,
        contactName: contactName.trim(),
        contactTitle: contactTitle.trim(),
        contactPhone: contactPhone.trim(),
      },
    });
  });

  return NextResponse.json(entry);
}
