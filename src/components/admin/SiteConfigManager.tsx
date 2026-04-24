"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, Check, Globe } from "lucide-react";

const FIELDS = [
  { key: "hero_label", label: "ป้ายชื่อย่อ (บรรทัดบน)", placeholder: "เช่น RSAT" },
  { key: "hero_title", label: "ชื่อระบบ / หัวข้อหลัก", placeholder: "ระบบติดตามข้อเสนอแนวทาง..." },
  { key: "hero_subtitle", label: "คำอธิบายใต้หัวข้อ", placeholder: "ในช่วงการรณรงค์เทศกาล ฯ" },
];

export function SiteConfigManager() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-config")
      .then((r) => r.json())
      .then((d) => { setValues(d); setLoading(false); });
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={22} /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Globe size={18} /> ตั้งค่าข้อความหน้าแรก
        </h2>
        <p className="text-sm text-gray-500 mt-1">แก้ไขข้อความที่แสดงบนหน้าสาธารณะ บันทึกแล้วเห็นผลทันที</p>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium text-gray-700 block mb-1">{f.label}</label>
              <input
                type="text"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <div className="pt-1">
            <Button onClick={handleSave} size="sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saved ? "บันทึกแล้ว ✓" : "บันทึก"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div>
        <p className="text-xs text-gray-400 mb-2 font-medium">ตัวอย่าง Hero Banner</p>
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-xl px-5 py-4 text-white">
          <p className="text-blue-300 text-xs font-medium mb-1">{values.hero_label || "—"}</p>
          <p className="font-bold text-base">{values.hero_title || "—"}</p>
          <p className="text-blue-200 text-sm mt-0.5">{values.hero_subtitle || "—"}</p>
        </div>
      </div>
    </div>
  );
}
