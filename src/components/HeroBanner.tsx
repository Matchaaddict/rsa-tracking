import Image from "next/image";
import { ShieldCheck, UsersRound, ChartNoAxesColumnIncreasing } from "lucide-react";

// ตึกแบบ deterministic — ไม่สุ่มตอน render เพื่อให้ SSR/CSR ตรงกัน
const FAR = Array.from({ length: 46 }, (_, i) => ({
  x: 330 + i * 19,
  w: 13 + ((i * 7) % 9),
  h: 30 + ((i * 37) % 70),
}));
const NEAR = Array.from({ length: 24 }, (_, i) => ({
  x: 440 + i * 30 + ((i * 13) % 11),
  w: 16 + ((i * 11) % 14),
  h: 45 + ((i * 53) % 110),
}));
const CARS = [
  { x: 690, y: 214, s: 1, c: "#e2e8f0" },
  { x: 760, y: 232, s: 1.25, c: "#94a3b8" },
  { x: 620, y: 240, s: 1.35, c: "#f8fafc" },
  { x: 845, y: 205, s: 0.85, c: "#cbd5e1" },
  { x: 905, y: 238, s: 1.3, c: "#475569" },
  { x: 560, y: 222, s: 1.1, c: "#e2e8f0" },
];

function Scene() {
  const HORIZON = 168;
  return (
    <svg
      viewBox="0 0 1200 270"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="hb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb2ea" />
          <stop offset="0.55" stopColor="#cfe3f7" />
          <stop offset="1" stopColor="#eef5fb" />
        </linearGradient>
        <radialGradient id="hb-sun" cx="0.62" cy="0.55" r="0.35">
          <stop offset="0" stopColor="#fff7ed" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff7ed" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hb-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b98aa" />
          <stop offset="1" stopColor="#3f4a5c" />
        </linearGradient>
        <linearGradient id="hb-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b1d4d" stopOpacity="0.97" />
          <stop offset="0.3" stopColor="#0f2a6b" stopOpacity="0.88" />
          <stop offset="0.5" stopColor="#1e3a8a" stopOpacity="0.35" />
          <stop offset="0.62" stopColor="#1e3a8a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hb-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.72" stopColor="#1e3a8a" stopOpacity="0" />
          <stop offset="0.85" stopColor="#1e40af" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0b1d4d" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <rect width="1200" height="270" fill="url(#hb-sky)" />
      <rect width="1200" height="270" fill="url(#hb-sun)" />

      {FAR.map((b, i) => (
        <rect key={`f${i}`} x={b.x} y={HORIZON - b.h} width={b.w} height={b.h} fill="#9fbad6" opacity={0.75} />
      ))}
      {NEAR.map((b, i) => (
        <g key={`n${i}`}>
          <rect x={b.x} y={HORIZON - b.h} width={b.w} height={b.h} fill={i % 3 === 0 ? "#6f8fb3" : "#7f9dbf"} />
          <rect x={b.x + b.w - 4} y={HORIZON - b.h} width={4} height={b.h} fill="#5b7a9f" opacity={0.6} />
        </g>
      ))}

      {/* tree line */}
      {Array.from({ length: 70 }, (_, i) => (
        <ellipse
          key={`t${i}`}
          cx={i * 18}
          cy={HORIZON + 2 + ((i * 5) % 6)}
          rx={14}
          ry={9 + ((i * 3) % 5)}
          fill={i % 2 ? "#5f8f3e" : "#4b7a33"}
        />
      ))}
      <rect x="0" y={HORIZON + 8} width="1200" height={270 - HORIZON} fill="#6b8f4e" />

      {/* highway */}
      <polygon points={`650,${HORIZON} 770,${HORIZON} 1250,270 180,270`} fill="url(#hb-road)" />
      <polygon points={`700,${HORIZON} 715,${HORIZON} 760,270 700,270`} fill="#a3b18a" opacity={0.9} />
      {[0.25, 0.75].map((f, i) => {
        const x0 = 650 + (i ? 85 : 25);
        const x1 = 180 + f * 1070 + (i ? 50 : -50);
        return (
          <line
            key={i}
            x1={x0}
            y1={HORIZON}
            x2={x1}
            y2={270}
            stroke="#f8fafc"
            strokeWidth={2.5}
            strokeDasharray="10 12"
            opacity={0.85}
          />
        );
      })}

      {/* overpass */}
      <path d={`M300 ${HORIZON - 22} C 600 ${HORIZON - 40}, 900 ${HORIZON - 40}, 1200 ${HORIZON - 70}`} stroke="#dbe4ee" strokeWidth={9} fill="none" />
      <path d={`M300 ${HORIZON - 17} C 600 ${HORIZON - 35}, 900 ${HORIZON - 35}, 1200 ${HORIZON - 65}`} stroke="#94a3b8" strokeWidth={2} fill="none" />
      {[380, 520, 980, 1110].map((x) => (
        <rect key={x} x={x} y={HORIZON - 34} width={7} height={40} fill="#cbd5e1" />
      ))}

      {CARS.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
          <rect x={-13} y={-8} width={26} height={14} rx={4} fill={c.c} />
          <rect x={-9} y={-13} width={18} height={7} rx={3} fill={c.c} opacity={0.9} />
          <rect x={-8} y={-12} width={16} height={4} rx={1.5} fill="#1e293b" opacity={0.55} />
          <circle cx={-9} cy={1} r={1.8} fill="#ef4444" />
          <circle cx={9} cy={1} r={1.8} fill="#ef4444" />
        </g>
      ))}

      <rect width="1200" height="270" fill="url(#hb-left)" />
      <rect width="1200" height="270" fill="url(#hb-right)" />
    </svg>
  );
}

export function HeroBanner({
  label,
  title,
  tagline,
  image,
  imagePosition = "center",
}: {
  label: string;
  title: string;
  tagline: string;
  image?: string;
  imagePosition?: string;
}) {
  const pillars = [
    { icon: ShieldCheck, label: "ลดอุบัติเหตุ" },
    { icon: UsersRound, label: "ถนนปลอดภัย" },
    { icon: ChartNoAxesColumnIncreasing, label: "สังคมยั่งยืน" },
  ];
  // ตัดบรรทัดที่ช่องว่างแรก เช่น "ขับเคลื่อนความปลอดภัยทางถนน / สู่สังคมไทยที่ยั่งยืน"
  const cut = title.indexOf(" ");
  const lines = cut > 0 ? [title.slice(0, cut), title.slice(cut + 1)] : [title];
  // ตัดบรรทัดได้เฉพาะระหว่างวลี ไม่ให้วลีขาดกลางคำ
  const phrases = tagline.split(/\s*·\s*/).filter(Boolean);
  return (
    <section className="@container relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#0b1d4d] text-white shadow-xl shadow-blue-950/10">
      {image ? (
        <>
          {/* รูปที่แอดมินอัปโหลด + ไล่เฉดทางซ้ายให้ตัวอักษรอ่านง่ายเสมอ */}
          <Image src={image} alt="" fill unoptimized priority className="object-cover" style={{ objectPosition: imagePosition }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1d4d]/85 via-[#0b1d4d]/45 to-transparent" />
        </>
      ) : (
        <Scene />
      )}
      {/* ทับภาพให้ตัวอักษรอ่านง่ายเมื่อแบนเนอร์แคบ ข้อความจะกินพื้นที่เกินครึ่งซ้าย */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1d4d]/80 via-[#0b1d4d]/55 to-[#0b1d4d]/10 @3xl:hidden" />
      <div className="relative flex min-h-[170px] items-center justify-between gap-6 px-5 py-6 @md:min-h-[200px] @md:px-8 @3xl:px-10">
        <div className="min-w-0 max-w-xl [text-shadow:0_1px_8px_rgba(11,29,77,0.55)]">
          <p className="flex items-center gap-2 text-base font-bold tracking-wide text-white/95 @md:text-lg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M12 2 L22 22 H16 L12 12 L8 22 H2 Z" fill="#60a5fa" />
            </svg>
            {label}
          </p>
          <h2 className="mt-2 text-[clamp(1rem,6cqw,2.1rem)] font-bold leading-tight">
            {lines.map((l, i) => (
              <span key={i} className={l.length <= 30 ? "block whitespace-nowrap" : "block text-balance"}>
                {l}
              </span>
            ))}
          </h2>
          <p className="mt-3 flex flex-wrap gap-x-1.5 text-[13px] leading-relaxed text-blue-100 @md:text-sm @3xl:text-base">
            {phrases.map((ph, i) => (
              <span key={i} className="whitespace-nowrap">
                {ph}
                {i < phrases.length - 1 && <span className="ml-1.5 text-blue-300">·</span>}
              </span>
            ))}
          </p>
        </div>
        <div className="hidden shrink-0 gap-2 @5xl:flex">
          {pillars.map(({ icon: Icon, label: l }) => (
            <div
              key={l}
              className="flex w-28 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-5 backdrop-blur-sm"
            >
              <Icon size={34} strokeWidth={1.7} />
              <span className="text-sm font-semibold">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
