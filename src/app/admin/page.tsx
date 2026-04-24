import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminPage() {
  const [committeeCount, agencyCount, responseCount] = await Promise.all([
    prisma.committee.count(),
    prisma.agency.count({ where: { isAdmin: false } }),
    prisma.response.count(),
  ]);

  const committees = await prisma.committee.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { guidelines: true, agencies: { where: { isAdmin: false } } } },
      guidelines: {
        include: { _count: { select: { responses: true } } },
      },
      agencies: { where: { isAdmin: false }, select: { id: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมระบบ</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "อนุกรรมการ", value: committeeCount, color: "bg-blue-600" },
          { label: "หน่วยงาน", value: agencyCount, color: "bg-teal-600" },
          { label: "การรายงานทั้งหมด", value: responseCount, color: "bg-green-600" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} text-white rounded-xl p-5 shadow`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm opacity-90 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">สถานะแต่ละอนุกรรมการ</h2>
          <Link href="/admin/committees" className="text-sm text-blue-600 hover:underline">
            จัดการ →
          </Link>
        </div>
        <div className="space-y-3">
          {committees.map((c) => {
            const total = c._count.agencies * c._count.guidelines;
            const done = c.guidelines.reduce((s, g) => s + g._count.responses, 0);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c._count.agencies} หน่วยงาน · {c._count.guidelines} แนวทาง
                  </p>
                </div>
                <div className="w-32 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : pct > 0 ? "bg-red-400" : "bg-gray-300"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-8 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
