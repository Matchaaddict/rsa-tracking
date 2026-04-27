import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mark all FROM_ADMIN messages for the logged-in agency as read.
// Called when the agency opens the messages tab.
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "agency" || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.agencyMessage.updateMany({
    where: { agencyId: session.user.id, direction: "FROM_ADMIN", readByAgency: false },
    data: { readByAgency: true },
  });
  return NextResponse.json({ ok: true });
}
