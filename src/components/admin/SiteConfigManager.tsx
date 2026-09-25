"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, Check, Globe, KeyRound } from "lucide-react";

const FIELDS = [
  { key: "site_page_title", label: "ชื่อแท็บเบราว์เซอร์", placeholder: "ระบบติดตามข้อเสนอแนวทางฯ | RSAT", textarea: false },
  { key: "hero_title", label: "ชื่อระบบ (หัวเว็บ)", placeholder: "ระบบติดตามข้อเสนอแนวทางป้องกันและลดอุบัติเหตุทางถนน ฯ", textarea: false },
  { key: "site_org", label: "บรรทัดใต้ชื่อระบบ (หน่วยงานเจ้าของ)", placeholder: "โดย สำนักเลขานุการ ศปถ. - กองบูรณาการความปลอดภัยทางถนน ...", textarea: false },
  { key: "hero_label", label: "ป้ายชื่อย่อบนแบนเนอร์", placeholder: "เช่น RSAT", textarea: false },
  { key: "banner_title", label: "ข้อความหลักบนแบนเนอร์", placeholder: "ขับเคลื่อนความปลอดภัยทางถนน สู่สังคมไทยที่ยั่งยืน", textarea: false },
  { key: "banner_tagline", label: "ข้อความรองบนแบนเนอร์", placeholder: "ติดตาม · เร่งรัด · บูรณาการ · ลดอุบัติเหตุ · เพื่อชีวิตที่ปลอดภัยกว่า", textarea: false },
  { key: "site_footnote", label: "หมายเหตุท้ายหน้า (Footnote)", placeholder: "ข้อความท้ายหน้า เช่น สงวนสิทธิ์ / แหล่งข้อมูล ฯ", textarea: true },
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
              {f.textarea ? (
                <textarea
                  rows={3}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
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

      {/* First-time login toggle */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-1">
          <KeyRound size={18} /> ระบบเข้าใช้งานครั้งแรก
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          เปิดหรือปิดหน้า &quot;เข้าใช้งานครั้งแรก&quot; ที่แสดง Username/Password ชั่วคราวให้หน่วยงาน
        </p>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">หน้าดูข้อมูลเข้าสู่ระบบครั้งแรก</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {values.first_time_login_enabled === "true"
                    ? "เปิดอยู่ — หน่วยงานสามารถเข้าดู Username/Password ได้"
                    : "ปิดอยู่ — หน้าดังกล่าวจะแสดงข้อความปิดระบบชั่วคราว"}
                </p>
              </div>
              <button
                onClick={() => {
                  const next = values.first_time_login_enabled === "true" ? "false" : "true";
                  const newValues = { ...values, first_time_login_enabled: next };
                  setValues(newValues);
                  fetch("/api/admin/site-config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ first_time_login_enabled: next }),
                  });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  values.first_time_login_enabled === "true" ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    values.first_time_login_enabled === "true" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

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
