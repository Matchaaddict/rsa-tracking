"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Check, Copy, ExternalLink, ImageIcon, Loader2, RotateCcw, Sparkles, Upload } from "lucide-react";
import { IMAGE_SLOTS, type ImageSlot } from "@/lib/siteImageSlots";

interface Uploaded {
  key: string;
  url: string;
  width: number | null;
  height: number | null;
}

const POSITIONS = [
  { value: "left", label: "ชิดซ้าย" },
  { value: "center", label: "กึ่งกลาง" },
  { value: "right", label: "ชิดขวา" },
];

// แอดมินเปลี่ยนรูปบนหน้าเว็บเอง — ไม่มีรูป = ใช้ภาพวาดเริ่มต้นของระบบ
export function SiteImageManager() {
  const [images, setImages] = useState<Record<string, Uploaded>>({});
  const [heroPosition, setHeroPosition] = useState("center");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/admin/site-images").then((r) => r.json()),
      fetch("/api/admin/site-config").then((r) => r.json()),
    ]).then(([imgs, cfg]) => {
      if (!alive) return;
      setImages(Object.fromEntries((imgs as Uploaded[]).map((i) => [i.key, i])));
      setHeroPosition(cfg.hero_banner_position || "center");
      setLoading(false);
    });
    return () => { alive = false; };
  }, [version]);

  async function savePosition(value: string) {
    setHeroPosition(value);
    await fetch("/api/admin/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hero_banner_position: value }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <ImageIcon size={18} /> รูปภาพบนหน้าเว็บ
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            อัปโหลดรูปเพื่อแทนภาพเริ่มต้นของระบบ ระบบจะย่อและแปลงไฟล์ให้โหลดเร็วอัตโนมัติ (รองรับ PNG, JPG, WebP ไม่เกิน 10 MB)
          </p>
        </div>
        <a href="/" target="_blank" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          ดูหน้าแรก <ExternalLink size={13} />
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {IMAGE_SLOTS.map((slot) => (
            <SlotCard
              key={slot.key}
              slot={slot}
              current={images[slot.key]}
              onChanged={reload}
              extra={
                slot.key === "hero_banner" && images.hero_banner ? (
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    ตำแหน่งภาพ
                    <select
                      value={heroPosition}
                      onChange={(e) => savePosition(e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    >
                      {POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null
              }
              position={slot.key === "hero_banner" ? heroPosition : "center"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  current,
  onChanged,
  extra,
  position,
}: {
  slot: ImageSlot;
  current?: Uploaded;
  onChanged: () => void;
  extra: React.ReactNode;
  position: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const isCard = slot.key.startsWith("kpi_");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("key", slot.key);
    fd.append("file", file);
    const res = await fetch("/api/admin/site-images", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "อัปโหลดไม่สำเร็จ");
      return;
    }
    onChanged();
  }

  async function reset() {
    if (!confirm(`ลบรูป "${slot.label}" และกลับไปใช้ภาพเริ่มต้นของระบบ?`)) return;
    setBusy(true);
    await fetch(`/api/admin/site-images?key=${slot.key}`, { method: "DELETE" });
    setBusy(false);
    onChanged();
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(slot.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — ผู้ใช้คัดลอกเองจากกล่องได้
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div>
          <p className="font-semibold text-gray-800">{slot.label}</p>
          <p className="text-xs text-gray-500">{slot.where}</p>
        </div>

        <div
          className={`relative overflow-hidden rounded-lg border border-dashed border-gray-300 ${
            isCard ? "mx-auto w-32 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]" : "w-full bg-gray-50"
          }`}
          style={{ aspectRatio: slot.aspect, maxHeight: slot.key === "sidebar_bg" ? 240 : undefined, marginInline: slot.key === "sidebar_bg" ? "auto" : undefined }}
        >
          {current ? (
            <Image
              src={current.url}
              alt={slot.label}
              fill
              unoptimized
              className={isCard ? "object-contain p-2" : "object-cover"}
              style={{ objectPosition: position }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-xs text-gray-400">
              <ImageIcon size={20} />
              ใช้ภาพเริ่มต้นของระบบ
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="animate-spin text-blue-600" size={22} />
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          แนะนำ: {slot.hint}
          {current?.width && current.height && (
            <span className="block text-gray-400">ปัจจุบัน {current.width}×{current.height}px</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload size={14} /> {current ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
          </Button>
          {current && (
            <Button size="sm" variant="secondary" onClick={reset} disabled={busy}>
              <RotateCcw size={14} /> ใช้ภาพเริ่มต้น
            </Button>
          )}
          {extra}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <details className="rounded-lg bg-violet-50/60 px-3 py-2 text-xs text-gray-600">
          <summary className="flex cursor-pointer items-center gap-1 font-medium text-violet-700">
            <Sparkles size={12} /> ตัวอย่างคำสั่งสร้างรูปด้วย AI
          </summary>
          <p className="mt-2 break-words font-mono text-[11px] leading-relaxed">{slot.prompt}</p>
          <button onClick={copyPrompt} className="mt-2 inline-flex items-center gap-1 font-medium text-violet-700 hover:underline">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </button>
        </details>
      </CardContent>
    </Card>
  );
}
