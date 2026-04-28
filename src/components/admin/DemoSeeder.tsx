"use client";

import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, FlaskConical, Trash2, Check, AlertTriangle } from "lucide-react";

export function DemoSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleSeed() {
    if (!confirm("สร้างข้อมูลทดสอบ กรมทดสอบ 1–5 ใช่ไหม?")) return;
    setSeeding(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      const skippedText = data.skipped?.length
        ? ` (ข้าม ${data.skipped.join(", ")} เพราะมีอยู่แล้ว)`
        : "";
      setResult(`✓ สร้างหน่วยงาน ${data.agencyCreated} กรม · ${data.implCreated} รายงาน · วาระ: ${data.festival}${skippedText}`);
      setIsError(false);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setIsError(true);
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete() {
    if (!confirm("ลบ กรมทดสอบ 1–5 และข้อมูลทั้งหมดออก ใช่ไหม?")) return;
    setDeleting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      setResult(`✓ ลบหน่วยงานทดสอบออก ${data.deleted} กรมแล้ว`);
      setIsError(false);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setIsError(true);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="border-dashed border-amber-300 bg-amber-50/50">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">ข้อมูลทดสอบ (Demo)</h3>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">สำหรับสาธิต</span>
        </div>
        <p className="text-xs text-amber-700">
          สร้าง <strong>กรมทดสอบ 1–5</strong> พร้อมรายงานความคืบหน้าหลากหลายสถานะ
          (เสร็จสิ้น / กำลังดำเนินการ / ยังไม่ดำเนินการ / ไม่เกี่ยวข้อง) ใช้วาระล่าสุดในระบบ
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleSeed}
            disabled={seeding || deleting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {seeding ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
            สร้างข้อมูลทดสอบ
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            disabled={seeding || deleting}
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            ลบข้อมูลทดสอบออก
          </Button>
        </div>
        {result && (
          <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${isError ? "bg-red-50 text-red-700" : "bg-white text-gray-700 border border-amber-200"}`}>
            {isError
              ? <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-500" />
              : <Check size={13} className="shrink-0 mt-0.5 text-green-600" />}
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
