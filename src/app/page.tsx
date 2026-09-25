import { AppShell } from "@/components/AppShell";
import { PublicDashboard } from "@/components/PublicDashboard";
import { getShellInfo } from "@/lib/shellInfo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const info = await getShellInfo();
  return (
    <AppShell info={info}>
      <main>
        <PublicDashboard />
      </main>
    </AppShell>
  );
}
