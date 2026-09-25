import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { getShellInfo } from "@/lib/shellInfo";
import { AdminPanel } from "@/components/AdminPanel";
import { getStaff } from "@/lib/staff";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [session, staff] = await Promise.all([auth(), getStaff()]);
  if (!session || !staff) {
    redirect("/login");
  }

  const secretary =
    staff.kind === "secretary"
      ? await prisma.subCommittee.findUnique({
          where: { id: staff.subCommitteeId },
          select: { id: true, name: true },
        })
      : null;

  return (
    <AppShell info={await getShellInfo()}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminPanel
          isSuperAdmin={session.user.isSuperAdmin ?? false}
          permissions={session.user.permissions ?? "[]"}
          adminId={session.user.id ?? ""}
          secretaryOf={secretary}
        />
      </main>
    </AppShell>
  );
}
