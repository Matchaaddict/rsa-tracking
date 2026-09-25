"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { sourceLabel } from "@/lib/tracking";
import { parseMarkdownProposals, type ParsedProposal } from "@/lib/parseMarkdownProposals";
import { Loader2, AlertTriangle, Check, Trash2, Wand2, Upload } from "lucide-react";

interface Festival { id: string; name: string; type: string; year: number }
interface SubCommittee { id: string; name: string }

type EditableRow = ParsedProposal & { include: boolean };

const SAMPLE_MD = `| คณะอนุกรรมการฯ | การจัดการเชิงระบบในประเด็นความเสี่ยงสำคัญ |
|---|---|
| **๑. ด้านการบริหารจัดการความปลอดภัยทางถนน** | ๑. พิจารณาการเสนอของบประมาณในการจัดหา เครื่องตรวจจับความเร็ว เครื่องตรวจวัดระดับแอลกอฮอล์ และ CCTV<br>๒. กำหนดกลไกด้านความปลอดภัยทางถนนในเด็กและเยาวชน<br>๓. จัดตั้งคณะทำงานเฉพาะกิจวิเคราะห์สาเหตุและจัดการความเสี่ยงสำคัญ |
| **๒. ด้านถนนและการสัญจรอย่างปลอดภัย** | ๑. ปรับปรุงโครงสร้างถนนป้องกันการหลับใน<br>๒. ติดตั้งป้ายเตือน ไฟส่องสว่าง แบริเออร์ ในพื้นที่ก่อสร้าง |`;

export function MarkdownImporter() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [festivalId, setFestivalId] = useState("");
  const [md, setMd] = useState("");
  const [parsed, setParsed] = useState<EditableRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/festivals").then((r) => r.json()),
      fetch("/api/admin/subcommittees").then((r) => r.json()),
    ])
      .then(([fs, scs]) => {
        setFestivals(fs);
        setSubCommittees(scs);
      })
      .catch(() => setError("โหลดข้อมูลวาระ/อนุฯ ไม่สำเร็จ"));
  }, []);

  function loadText(text: string) {
    setMd(text);
    setDone(null);
    setError(null);
    setParsed([]);
    setWarnings([]);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadText(ev.target?.result as string ?? "");
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => loadText(ev.target?.result as string ?? "");
      reader.readAsText(file, "utf-8");
    }
  }

  function handleParse() {
    setDone(null);
    setError(null);
    if (!md.trim()) return;
    const result = parseMarkdownProposals(md, subCommittees);
    setParsed(result.proposals.map((p) => ({ ...p, include: true })));
    setWarnings(result.warnings);
  }

  async function handleImport() {
    if (!festivalId) return;
    const items = parsed.filter((p) => p.include && p.scId);
    if (items.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/proposals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          festivalId,
          proposals: items.map((p) => ({
            title: p.title,
            description: p.description,
            scId: p.scId,
          })),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "นำเข้าไม่สำเร็จ");
      }
      const data = await res.json();
      setDone({ count: data.created });
      setParsed([]);
      setMd("");
      setWarnings([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setImporting(false);
    }
  }

  function updateRow(idx: number, patch: Partial<EditableRow>) {
    setParsed((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  const includedCount = parsed.filter((p) => p.include && p.scId).length;
  const fest = festivals.find((f) => f.id === festivalId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">นำเข้าข้อเสนอจาก Markdown</h2>
        <p className="text-sm text-gray-500 mt-1">
          วาง markdown table → กดวิเคราะห์ → ตรวจสอบ/แก้ไข title → ยืนยันนำเข้า
        </p>
      </div>

      {done && (
        <Card className="border-l-4 border-l-green-500 bg-green-50">
          <CardContent className="py-3 flex items-center gap-2">
            <Check size={18} className="text-green-600" />
            <p className="text-sm text-gray-800">
              นำเข้าสำเร็จ <span className="font-semibold">{done.count}</span> ข้อเสนอ
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">วาระที่จะนำเข้า</label>
            <select
              value={festivalId}
              onChange={(e) => setFestivalId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— เลือกวาระ —</option>
              {festivals.map((f) => (
                <option key={f.id} value={f.id}>
                  {sourceLabel(f)} ({f.name})
                </option>
              ))}
            </select>
            {festivals.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ ยังไม่มีวาระในระบบ — ไปที่แท็บ &quot;วาระ&quot; เพื่อเพิ่มก่อน
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Markdown ต้นฉบับ</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMd(SAMPLE_MD)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ใช้ตัวอย่าง
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".md,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700"
                >
                  <Upload size={11} /> เลือกไฟล์ .md
                </button>
              </div>
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              className={`relative rounded-lg transition-colors ${dragging ? "ring-2 ring-blue-400 bg-blue-50" : ""}`}
            >
              {dragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-blue-50 border-2 border-dashed border-blue-400 pointer-events-none">
                  <p className="text-sm font-medium text-blue-600">วางไฟล์ที่นี่</p>
                </div>
              )}
              <textarea
                value={md}
                onChange={(e) => setMd(e.target.value)}
                rows={10}
                placeholder={
                  "วาง markdown table หรือ drag & drop ไฟล์ .md มาที่นี่\n\nรูปแบบที่รองรับ:\n  คอลัมน์ 1 = ชื่ออนุฯ ขึ้นต้นด้วยเลข 1-8 (รับเลขไทยและอารบิก)\n  คอลัมน์ 2 = ข้อย่อยคั่นด้วย <br>\n\nระบบจะแปลงเลขไทย ๑-๙ เป็น 1-9 อัตโนมัติ"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={handleParse} disabled={!md.trim()}>
                <Wand2 size={14} /> วิเคราะห์
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50">
          <CardContent className="py-3 space-y-1">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={14} /> คำเตือน ({warnings.length})
            </p>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700">• {w}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {parsed.length > 0 && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-medium text-gray-700">
                พบ {parsed.length} ข้อเสนอ — จะถูกนำเข้า{" "}
                <span className="text-blue-600 font-semibold">{includedCount}</span> ข้อ
              </p>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setParsed((prev) => prev.map((p) => ({ ...p, include: true })))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={() => setParsed((prev) => prev.map((p) => ({ ...p, include: false })))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {parsed.map((p, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${
                    !p.scId
                      ? "border-red-300 bg-red-50"
                      : p.include
                        ? "border-gray-200"
                        : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={p.include}
                      onChange={(e) => updateRow(idx, { include: e.target.checked })}
                      disabled={!p.scId}
                      className="mt-1.5 rounded text-blue-600"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.scId ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          อนุฯ {p.scNumber}
                          {!p.scId && " (ไม่มีในระบบ)"}
                        </span>
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                      </div>
                      <input
                        type="text"
                        value={p.title}
                        onChange={(e) => updateRow(idx, { title: e.target.value })}
                        placeholder="ชื่อข้อสั้นๆ"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <details>
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          ดู/แก้ไขรายละเอียดเต็ม
                        </summary>
                        <textarea
                          value={p.description}
                          onChange={(e) => updateRow(idx, { description: e.target.value })}
                          rows={3}
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </details>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParsed((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500"
                      title="ลบออกจากรายการ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={handleImport}
                disabled={!festivalId || includedCount === 0 || importing}
              >
                {importing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {importing
                  ? "กำลังนำเข้า..."
                  : `นำเข้า ${includedCount} ข้อเสนอ${
                      fest ? ` → ${sourceLabel(fest)}` : ""
                    }`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
