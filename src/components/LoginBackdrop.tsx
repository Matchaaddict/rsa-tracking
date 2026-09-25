"use client";

import Image from "next/image";
import { useState } from "react";
import { imageUrl } from "@/lib/siteImageSlots";

// พื้นหลังหน้าเข้าสู่ระบบ — ถ้าแอดมินยังไม่อัปโหลดรูป (404) จะซ่อนตัวเอง เหลือพื้นเดิม
export function LoginBackdrop() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <>
      <Image
        src={imageUrl("login_bg")}
        alt=""
        fill
        unoptimized
        priority
        className="object-cover"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-[#0b1d4d]/40" />
    </>
  );
}
