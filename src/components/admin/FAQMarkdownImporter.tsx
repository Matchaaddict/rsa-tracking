"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { parseMarkdownFAQs, type ParsedFAQ } from "@/lib/parseMarkdownFAQs";
import { Loader2, AlertTriangle, Check, Trash2, Wand2, Upload, X } from "lucide-react";

type EditableRow = ParsedFAQ & { include: boolean };

const SAMPLE_MD = `## ระบบ RSAT คืออะไร?
RSAT คือระบบติดตามข้อเสนอแนวทางในการป้องกันและลดอุบัติเหตุทางถนน

## หน่วยงานเข้าสู่ระบบยังไง?
ใช้ปุ่ม "เข้าสู่ระบบสำหรับหน่วยงาน" มุมขวาบนของหน้าหลัก

## ลืมรหัสผ่านทำยังไง?
ติดต่อเลขาธิการคณะกรรมการฯ เพื่อรีเซ็ตรหัสผ่าน
`;

interface Props {
  onImported: () => void;
  onCancel: () => void;
}

export function FAQMarkdownImporter({ onImported, onCancel }: Props) {
  const [md, setMd] = useState("");
  const [parsed, setParsed] = useState<EditableRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadText(text: string) {
    setMd(text);
    setError(null);
    setParsed([]);
    setWarnings([]);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadText((ev.target?.result as string) ?? "");
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => loadText((ev.target?.result as string) ?? "");
      reader.readAsText(file, "utf-8");
    }
  }

  function handleParse() {
    setError(null);
    if (!md.trim()) return;
    const result = parseMarkdownFAQs(md);
    setParsed(result.faqs.map((f) => ({ ...f, include: true })));
    setWarnings(result.warnings);
  }

  async function handleImport() {
    const items = parsed.filter((p) => p.include);
    if (items.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/faqs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          published: publishImmediately,
          faqs: items.map((p) => ({ question: p.question, answer: p.answer })),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "นำเข้าไม่สำเร็จ");
      }
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setImporting(false);
    }
  }

  function updateRow(idx: number, patch: Partial<EditableRow>) {
    setParsed((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  const includedCount = parsed.filter((p) => p.include).length;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800">นำเข้า FAQ จาก Markdown</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              ใช้หัวข้อ <code className="bg-gray-100 px-1">## คำถาม</code> หรือ <code className="bg-gray-100 px-1">Q: / A:</code> ตามด้วยคำตอบ
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X size={14} />
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border-l-4 border-l-red-500 px-3 py-2">
            <AlertTriangle size={14} className="text-red-600 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

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
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
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
                "วาง markdown หรือ drag & drop ไฟล์ .md มาที่นี่\n\nรูปแบบที่รองรับ:\n  ## คำถาม\n  คำตอบ (หลายบรรทัดได้)\n\n  ### คำถาม\n  คำตอบ\n\nหรือ:\n  Q: คำถาม\n  A: คำตอบ"
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

        {warnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 border-l-4 border-l-amber-500 px-3 py-2 space-y-1">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={13} /> คำเตือน ({warnings.length})
            </p>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700">• {w}</p>
            ))}
          </div>
        )}

        {parsed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-medium text-gray-700">
                พบ {parsed.length} FAQ — จะถูกนำเข้า{" "}
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

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {parsed.map((p, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${
                    p.include ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={p.include}
                      onChange={(e) => updateRow(idx, { include: e.target.checked })}
                      className="mt-1.5 rounded text-blue-600"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                      </div>
                      <input
                        type="text"
                        value={p.question}
                        onChange={(e) => updateRow(idx, { question: e.target.value })}
                        placeholder="คำถาม"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        value={p.answer}
                        onChange={(e) => updateRow(idx, { answer: e.target.value })}
                        rows={3}
                        placeholder="คำตอบ"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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

            <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="rounded text-blue-600"
                />
                เผยแพร่ทันที (ถ้าไม่ติ๊ก จะถูกซ่อนไว้)
              </label>
              <Button onClick={handleImport} disabled={includedCount === 0 || importing}>
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {importing ? "กำลังนำเข้า..." : `นำเข้า ${includedCount} FAQ`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
