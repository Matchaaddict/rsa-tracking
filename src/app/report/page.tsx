import { Navbar } from "@/components/Navbar";
import { ReportPage } from "@/components/ReportPage";

export const dynamic = "force-dynamic";

export default function Report() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        <ReportPage />
      </main>
    </div>
  );
}
