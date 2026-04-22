"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { STATUS_LABELS, STATUS_COLORS, FESTIVAL_TYPE_LABELS } from "@/lib/utils";
import {
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface Festival {
  id: string;
  name: string;
  type: string;
  year: number;
}

interface SubCommittee {
  id: string;
  name: string;
}

interface Agency {
  id: string;
  name: string;
}

interface Implementation {
  id: string;
  agencyId: string;
  proposalId: string;
  content: string | null;
  status: string;
  agency: Agency;
}

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  orderNumber: number;
  festival: Festival;
  festivalId: string;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: Implementation[];
}

interface AgencyData {
  id: string;
  name: string;
  subCommittees: { subCommittee: SubCommittee }[];
  implementations: { status: string; content: string | null; proposal: { festival: Festival } }[];
}

interface DashboardData {
  festivals: Festival[];
  proposals: Proposal[];
  agencies: AgencyData[];
  stats: {
    totalAgencies: number;
    agenciesWithData: number;
    totalProposals: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    totalImplementations: number;
  };
}

const PIE_COLORS = ["#22c55e", "#eab308", "#9ca3af"];

export function PublicDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<string>("all");
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"proposals" | "agencies">("proposals");

  useEffect(() => {
    fetch("/api/public/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  if (!data) return null;

  const filteredProposals =
    selectedFestival === "all"
      ? data.proposals
      : data.proposals.filter((p) => p.festivalId === selectedFestival);

  // ไม่นับ NOT_RELEVANT ใน total
  const totalImplementationsForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status !== "NOT_RELEVANT").length,
    0
  );
  const completedForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status === "COMPLETED").length,
    0
  );
  const inProgressForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status === "IN_PROGRESS").length,
    0
  );
  const notStartedForFilter = filteredProposals.reduce(
    (acc, p) => acc + p.implementations.filter((i) => i.status === "NOT_STARTED").length,
    0
  );

  const agenciesWithDataForFilter = new Set(
    filteredProposals.flatMap((p) =>
      p.implementations
        .filter((i) => i.content && i.status !== "NOT_RELEVANT")
        .map((i) => i.agencyId)
    )
  ).size;

  const pieData = [
    { name: STATUS_LABELS.COMPLETED, value: completedForFilter },
    { name: STATUS_LABELS.IN_PROGRESS, value: inProgressForFilter },
    { name: STATUS_LABELS.NOT_STARTED, value: notStartedForFilter },
  ].filter((d) => d.value > 0);

  const barData = filteredProposals.map((p) => ({
    name: `ข้อ ${p.orderNumber}`,
    label: p.title.slice(0, 20) + (p.title.length > 20 ? "…" : ""),
    completed: p.implementations.filter((i) => i.status === "COMPLETED").length,
    inProgress: p.implementations.filter((i) => i.status === "IN_PROGRESS").length,
    notStarted: p.implementations.filter((i) => i.status === "NOT_STARTED").length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ระบบติดตามข้อเสนอแนวทางในการป้องกันและลดอุบัติเหตุทางถนน
        </h1>
        <p className="text-gray-500 mt-1">
          ในช่วงการรณรงค์และภายหลังการรณรงค์ป้องกันและลดอุบัติเหตุทางถนน เทศกาล ฯ
        </p>
      </div>

      {/* Festival Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedFestival("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedFestival === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          ทุกเทศกาล
        </button>
        {data.festivals.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFestival(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedFestival === f.id
                ? f.type === "NEW_YEAR"
                  ? "bg-blue-600 text-white"
                  : "bg-orange-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {FESTIVAL_TYPE_LABELS[f.type]} {f.year}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{agenciesWithDataForFilter}</p>
                <p className="text-xs text-gray-500">จาก {data.stats.totalAgencies} หน่วยงาน</p>
                <p className="text-xs text-gray-400">ที่กรอกข้อมูล</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{filteredProposals.length}</p>
                <p className="text-xs text-gray-500">ข้อเสนอทั้งหมด</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedForFilter}</p>
                <p className="text-xs text-gray-500">ดำเนินการแล้ว</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inProgressForFilter}</p>
                <p className="text-xs text-gray-500">กำลังดำเนินการ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {totalImplementationsForFilter > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">สัดส่วนสถานะการดำเนินงาน</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={false}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {barData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ความคืบหน้ารายข้อเสนอ</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => {
                        const labels: Record<string, string> = {
                          completed: STATUS_LABELS.COMPLETED,
                          inProgress: STATUS_LABELS.IN_PROGRESS,
                          notStarted: STATUS_LABELS.NOT_STARTED,
                        };
                        return [value, labels[name as string] || name];
                      }}
                    />
                    <Bar dataKey="completed" stackId="a" fill="#22c55e" name="completed" />
                    <Bar dataKey="inProgress" stackId="a" fill="#eab308" name="inProgress" />
                    <Bar dataKey="notStarted" stackId="a" fill="#9ca3af" name="notStarted" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("proposals")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "proposals"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            รายข้อเสนอ ({filteredProposals.length})
          </button>
          <button
            onClick={() => setActiveTab("agencies")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "agencies"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            รายหน่วยงาน ({data.agencies.length})
          </button>
        </nav>
      </div>

      {/* Proposals Tab */}
      {activeTab === "proposals" && (
        <div className="space-y-3">
          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                ยังไม่มีข้อเสนอ
              </CardContent>
            </Card>
          ) : (
            filteredProposals.map((proposal) => {
              const relevant = proposal.implementations.filter(
                (i) => i.status !== "NOT_RELEVANT"
              );
              const done = relevant.filter((i) => i.status === "COMPLETED").length;
              const total = relevant.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <Card key={proposal.id}>
                  <div
                    className="px-6 py-4 cursor-pointer"
                    onClick={() =>
                      setExpandedProposal(
                        expandedProposal === proposal.id ? null : proposal.id
                      )
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-gray-400">
                            ข้อ {proposal.orderNumber}
                          </span>
                          <Badge
                            variant={
                              proposal.festival.type === "NEW_YEAR" ? "default" : "warning"
                            }
                          >
                            {FESTIVAL_TYPE_LABELS[proposal.festival.type]}{" "}
                            {proposal.festival.year}
                          </Badge>
                          {proposal.subCommittees.map((sc) => (
                            <Badge key={sc.subCommittee.id} variant="gray">
                              {sc.subCommittee.name}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-1 font-medium text-gray-900">{proposal.title}</p>
                        {proposal.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{proposal.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{pct}%</p>
                          <p className="text-xs text-gray-400">{done}/{total} หน่วยงาน</p>
                        </div>
                        {expandedProposal === proposal.id ? (
                          <ChevronUp size={18} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {expandedProposal === proposal.id && proposal.implementations.length > 0 && (
                    <div className="border-t border-gray-100 px-6 py-4 space-y-3">
                      {proposal.implementations.map((impl) => (
                        <div
                          key={impl.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {impl.agency.name}
                            </p>
                            {impl.content ? (
                              <p className="text-sm text-gray-600 mt-0.5">{impl.content}</p>
                            ) : (
                              <p className="text-sm text-gray-400 italic mt-0.5">ยังไม่ได้กรอกข้อมูล</p>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[impl.status]}`}
                          >
                            {STATUS_LABELS[impl.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Agencies Tab */}
      {activeTab === "agencies" && (
        <div className="space-y-3">
          {data.agencies.map((agency) => {
            const relevantImpls = agency.implementations.filter((i) =>
              selectedFestival === "all"
                ? true
                : i.proposal.festival.id === selectedFestival
            );
            const done = relevantImpls.filter((i) => i.status === "COMPLETED").length;
            const filled = relevantImpls.filter((i) => i.content).length;

            return (
              <Card key={agency.id}>
                <div
                  className="px-6 py-4 cursor-pointer"
                  onClick={() =>
                    setExpandedAgency(
                      expandedAgency === agency.id ? null : agency.id
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{agency.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agency.subCommittees.map((sc) => (
                          <Badge key={sc.subCommittee.id} variant="gray">
                            {sc.subCommittee.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{done} เสร็จ / {filled} กรอก</p>
                        <p className="text-xs text-gray-400">{relevantImpls.length} ข้อทั้งหมด</p>
                      </div>
                      {expandedAgency === agency.id ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedAgency === agency.id && relevantImpls.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-4 space-y-2">
                    {relevantImpls.map((impl, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                impl.proposal.festival.type === "NEW_YEAR" ? "default" : "warning"
                              }
                            >
                              {FESTIVAL_TYPE_LABELS[impl.proposal.festival.type]}{" "}
                              {impl.proposal.festival.year}
                            </Badge>
                          </div>
                          {impl.content ? (
                            <p className="text-sm text-gray-600 mt-1">{impl.content}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic mt-1">ยังไม่กรอกข้อมูล</p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[impl.status]}`}
                        >
                          {STATUS_LABELS[impl.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
