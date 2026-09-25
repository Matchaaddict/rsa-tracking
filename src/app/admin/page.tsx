import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getShellInfo } from "@/lib/shellInfo";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/login");
  }

  return (
    <AppShell info={await getShellInfo()}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminPanel
          isSuperAdmin={session.user.isSuperAdmin ?? false}
          permissions={session.user.permissions ?? "[]"}
          adminId={session.user.id ?? ""}
        />
      </main>
    </AppShell>
  );
}
