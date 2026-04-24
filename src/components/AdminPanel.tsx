"use client";

import { useState } from "react";
import { FestivalManager } from "./admin/FestivalManager";
import { SubCommitteeManager } from "./admin/SubCommitteeManager";
import { AgencyManager } from "./admin/AgencyManager";
import { ProposalManager } from "./admin/ProposalManager";
import { AccountSettings } from "./admin/AccountSettings";
import { CalendarDays, Users, Building2, FileText, KeyRound } from "lucide-react";

const TABS = [
  { id: "festivals", label: "เทศกาล", icon: CalendarDays },
  { id: "subcommittees", label: "อนุกรรมการ", icon: Users },
  { id: "agencies", label: "หน่วยงาน", icon: Building2 },
  { id: "proposals", label: "ข้อเสนอ", icon: FileText },
  { id: "account", label: "รหัสผ่าน", icon: KeyRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("festivals");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">แผงควบคุมแอดมิน</h1>
        <p className="text-gray-500 mt-1">จัดการข้อมูลระบบติดตามข้อเสนอแนวทางฯ (RSAT)</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "festivals" && <FestivalManager />}
        {activeTab === "subcommittees" && <SubCommitteeManager />}
        {activeTab === "agencies" && <AgencyManager />}
        {activeTab === "proposals" && <ProposalManager />}
        {activeTab === "account" && <AccountSettings />}
      </div>
    </div>
  );
}
