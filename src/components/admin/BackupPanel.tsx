"use client";

import { Card, CardContent } from "../ui/card";
import { Database, Download, ShieldAlert } from "lucide-react";

export function BackupPanel() {
  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-800">สำรองข้อมูลทั้งระบบ (Backup)</h3>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          ดาวน์โหลด snapshot ทั้งฐานข้อมูลในรูปแบบ JSON ไฟล์เดียว ครอบคลุม:
          วาระ · อนุกรรมการ · หน่วยงาน · ข้อเสนอ · ผลการดำเนินงาน · ประวัติการรายงาน · FAQ · ข้อความ · บัญชีแอดมิน
          <br />
          แนะนำให้ดาวน์โหลดเก็บไว้เป็นระยะ (เช่น สัปดาห์ละครั้ง หรือก่อน-หลังการประชุม) — ใช้ตั้งชื่อไฟล์ตามวันที่อัตโนมัติ
        </p>

        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
          <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            ไฟล์ backup มีข้อมูลละเอียดอ่อน (รหัสผ่านที่เข้ารหัสไว้, ข้อมูลภายใน) — เก็บในที่ปลอดภัย
            <br />
            ไม่ควรอัปโหลดขึ้นที่สาธารณะ
          </p>
        </div>

        <a
          href="/api/admin/backup"
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors w-fit"
        >
          <Download size={14} /> ดาวน์โหลด Backup (.json)
        </a>
      </CardContent>
    </Card>
  );
}
