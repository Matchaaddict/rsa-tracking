import { AppShell } from "@/components/AppShell";
import { ReportPage } from "@/components/ReportPage";
import { getShellInfo } from "@/lib/shellInfo";

export const dynamic = "force-dynamic";

export default async function Report() {
  const info = await getShellInfo();
  return (
    <AppShell info={info}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        <ReportPage />
      </main>
    </AppShell>
  );
}
