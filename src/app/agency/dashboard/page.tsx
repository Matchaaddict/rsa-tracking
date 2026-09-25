import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getShellInfo } from "@/lib/shellInfo";
import { AgencyDashboard } from "@/components/AgencyDashboard";
import { prisma } from "@/lib/prisma";
import { agencyProposalWhere } from "@/lib/tracking";

export default async function AgencyDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "agency") {
    redirect("/agency/login");
  }

  const agencyId = session.user.id!;

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      passwordChangedByAgency: true,
      subCommittees: { select: { subCommitteeId: true } },
    },
  });

  const subCommitteeIds = agency?.subCommittees.map((s) => s.subCommitteeId) ?? [];

  const [proposals, unreadAdminMessages] = await Promise.all([
    prisma.proposal.findMany({
      where: agencyProposalWhere(agencyId, subCommitteeIds),
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        implementations: {
          where: { agencyId },
          include: { progressEntries: { orderBy: { createdAt: "desc" } } },
        },
      },
    }),
    prisma.agencyMessage.count({
      where: { agencyId, direction: "FROM_ADMIN", readByAgency: false },
    }),
  ]);

  return (
    <AppShell info={await getShellInfo()}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AgencyDashboard
          agencyName={session.user.name!}
          initialProposals={proposals as never}
          isDefaultPassword={!agency?.passwordChangedByAgency}
          initialUnreadCount={unreadAdminMessages}
        />
      </main>
    </AppShell>
  );
}
