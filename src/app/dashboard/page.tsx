import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ResponseForm from "@/components/ResponseForm";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin;
  if (isAdmin) redirect("/admin");

  const agencyId = parseInt(session.user.id);
  const committeeId = parseInt((session.user as { committeeId?: string })?.committeeId ?? "");

  if (isNaN(committeeId)) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center text-gray-600">
        บัญชีนี้ยังไม่ได้ถูกกำหนดให้อยู่ในอนุกรรมการใด กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  const [agency, committee, guidelines] = await Promise.all([
    prisma.agency.findUnique({ where: { id: agencyId } }),
    prisma.committee.findUnique({ where: { id: committeeId } }),
    prisma.guideline.findMany({
      where: { committeeId },
      orderBy: { order: "asc" },
      include: {
        responses: { where: { agencyId }, take: 1 },
      },
    }),
  ]);

  if (!committee) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center text-gray-600">
        ไม่พบข้อมูลอนุกรรมการ
      </div>
    );
  }

  const respondedCount = guidelines.filter((g) => g.responses.length > 0).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h1 className="text-xl font-bold text-blue-900">{agency?.name}</h1>
        <p className="text-gray-600 mt-1">
          คณะอนุกรรมการ: <span className="font-medium text-gray-800">{committee.name}</span>
        </p>
        <div className="mt-3 text-sm text-gray-500">
          ส่งผลการดำเนินงานแล้ว{" "}
          <span className="font-bold text-blue-700">
            {respondedCount}/{guidelines.length}
          </span>{" "}
          ข้อ
        </div>
      </div>

      <div className="space-y-4">
        {guidelines.map((g, idx) => {
          const existing = g.responses[0];
          return (
            <div key={g.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{g.title}</h3>
                    {existing ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✓ ส่งแล้ว
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        ยังไม่ส่ง
                      </span>
                    )}
                  </div>
                  {g.description && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{g.description}</p>
                  )}
                  <ResponseForm
                    guidelineId={g.id}
                    existingProgress={existing?.progress}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {guidelines.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          ยังไม่มีข้อเสนอแนวทางในอนุกรรมการนี้
        </div>
      )}
    </div>
  );
}
