import { prisma } from "@/lib/db";
import { createCommittee } from "@/actions/committee";
import Link from "next/link";

export default async function CommitteesPage() {
  const committees = await prisma.committee.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { guidelines: true, agencies: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">อนุกรรมการและแนวทาง</h1>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">เพิ่มอนุกรรมการใหม่</h2>
        <form action={createCommittee} className="flex gap-3">
          <input name="name" placeholder="ชื่ออนุกรรมการ" required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input name="order" type="number" placeholder="ลำดับ" defaultValue={committees.length + 1}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            เพิ่ม
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {committees.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{c.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {c._count.guidelines} แนวทาง · {c._count.agencies} หน่วยงาน
              </p>
            </div>
            <Link href={`/admin/committees/${c.id}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
              แก้ไข / จัดการ →
            </Link>
          </div>
        ))}
        {committees.length === 0 && (
          <p className="text-center text-gray-400 py-8">ยังไม่มีอนุกรรมการ</p>
        )}
      </div>
    </div>
  );
}
