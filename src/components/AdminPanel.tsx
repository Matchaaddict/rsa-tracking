"use client";

import { useState, useEffect } from "react";
import { FestivalManager } from "./admin/FestivalManager";
import { SubCommitteeManager } from "./admin/SubCommitteeManager";
import { AgencyManager } from "./admin/AgencyManager";
import { ProposalManager } from "./admin/ProposalManager";
import { AccountSettings } from "./admin/AccountSettings";
import { AnalysisPanel } from "./admin/AnalysisPanel";
import { SiteConfigManager } from "./admin/SiteConfigManager";
import { FAQManager } from "./admin/FAQManager";
import { MessagesManager } from "./admin/MessagesManager";
import { AdminManager } from "./admin/AdminManager";
import { CalendarDays, Users, Building2, FileText, KeyRound, BarChart2, Globe, HelpCircle, MessageCircle, ShieldCheck } from "lucide-react";

const ALL_TABS = [
  { id: "festivals",     label: "เทศกาล",      icon: CalendarDays },
  { id: "subcommittees", label: "อนุกรรมการ",   icon: Users },
  { id: "agencies",      label: "หน่วยงาน",     icon: Building2 },
  { id: "proposals",     label: "ข้อเสนอ",      icon: FileText },
  { id: "analysis",      label: "วิเคราะห์",    icon: BarChart2 },
  { id: "siteconfig",    label: "หน้าเว็บ",      icon: Globe },
  { id: "faq",           label: "FAQ",           icon: HelpCircle },
  { id: "messages",      label: "ข้อความ",       icon: MessageCircle },
  { id: "account",       label: "รหัสผ่าน",      icon: KeyRound },
  { id: "admins",        label: "แอดมิน",        icon: ShieldCheck },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

export function AdminPanel({
  isSuperAdmin,
  permissions,
  adminId,
}: {
  isSuperAdmin: boolean;
  permissions: string;
  adminId: string;
}) {
  const allowedTabIds: Set<string> = isSuperAdmin
    ? new Set(ALL_TABS.map((t) => t.id))
    : new Set([...(JSON.parse(permissions) as string[]), "account"]);

  const TABS = ALL_TABS.filter((t) => allowedTabIds.has(t.id));

  const [activeTab, setActiveTab] = useState<TabId>(TABS[0]?.id ?? "account");
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    function fetchUnread() {
      fetch("/api/admin/messages/unread")
        .then((r) => r.json())
        .then((d) => setUnreadMessages(d.count ?? 0));
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

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
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === "messages" && unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
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
        {activeTab === "analysis" && <AnalysisPanel />}
        {activeTab === "siteconfig" && <SiteConfigManager />}
        {activeTab === "faq" && <FAQManager />}
        {activeTab === "messages" && (
          <MessagesManager onReply={() =>
            fetch("/api/admin/messages/unread").then(r => r.json()).then(d => setUnreadMessages(d.count ?? 0))
          } />
        )}
        {activeTab === "account" && <AccountSettings />}
        {activeTab === "admins" && <AdminManager currentAdminId={adminId} />}
      </div>
    </div>
  );
}
