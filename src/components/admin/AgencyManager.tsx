"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Plus, Pencil, Trash2, Loader2, X, Check, Copy, RefreshCw } from "lucide-react";

interface SubCommittee {
  id: string;
  name: string;
}

interface Agency {
  id: string;
  name: string;
  username: string;
  password: string;
  subCommittees: { subCommittee: SubCommittee }[];
  _count?: { implementations: number };
}

function generatePassword(length = 8) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function generateUsername(name: string, index: number) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]/g, "")
    .slice(0, 10);
  return `agency${index.toString().padStart(3, "0")}`;
}

export function AgencyManager() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: generatePassword(),
    subCommitteeIds: [] as string[],
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSc, setFilterSc] = useState("all");

  async function load() {
    const [agRes, scRes] = await Promise.all([
      fetch("/api/admin/agencies"),
      fetch("/api/admin/subcommittees"),
    ]);
    setAgencies(await agRes.json());
    setSubCommittees(await scRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editId ? `/api/admin/agencies/${editId}` : "/api/admin/agencies";
    const method = editId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", username: "", password: generatePassword(), subCommitteeIds: [] });
    setEditId(null);
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบหน่วยงาน "${name}"? ข้อมูลการดำเนินงานทั้งหมดจะถูกลบด้วย`)) return;
    await fetch(`/api/admin/agencies/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(a: Agency) {
    setForm({
      name: a.name,
      username: a.username,
      password: "",
      subCommitteeIds: a.subCommittees.map((s) => s.subCommittee.id),
    });
    setEditId(a.id);
    setShowForm(true);
  }

  function copyCredentials(a: Agency) {
    const text = `หน่วยงาน: ${a.name}\nUsername: ${a.username}`;
    navigator.clipboard.writeText(text);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleSc(id: string) {
    setForm((f) => ({
      ...f,
      subCommitteeIds: f.subCommitteeIds.includes(id)
        ? f.subCommitteeIds.filter((x) => x !== id)
        : [...f.subCommitteeIds, id],
    }));
  }

  const filtered = agencies.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.username.toLowerCase().includes(search.toLowerCase());
    const matchSc =
      filterSc === "all" ||
      a.subCommittees.some((s) => s.subCommittee.id === filterSc);
    return matchSearch && matchSc;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">
          จัดการหน่วยงาน ({agencies.length} หน่วย)
        </h2>
        <Button
          size="sm"
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm({
              name: "",
              username: `agency${(agencies.length + 1).toString().padStart(3, "0")}`,
              password: generatePassword(),
              subCommitteeIds: [],
            });
          }}
        >
          <Plus size={16} /> เพิ่มหน่วยงาน
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">ชื่อหน่วยงาน</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="กรมป้องกันและบรรเทาสาธารณภัย"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Password {editId && <span className="text-gray-400">(เว้นว่างถ้าไม่เปลี่ยน)</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!editId}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setForm({ ...form, password: generatePassword() })}
                    >
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  อนุกรรมการที่สังกัด (เลือกได้หลายคณะ)
                </label>
                <div className="flex flex-wrap gap-2">
                  {subCommittees.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => toggleSc(sc.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.subCommitteeIds.includes(sc.id)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {sc.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editId ? "บันทึก" : "เพิ่ม"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                >
                  <X size={14} /> ยกเลิก
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="ค้นหาหน่วยงาน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={filterSc}
          onChange={(e) => setFilterSc(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">ทุกอนุกรรมการ</option>
          {subCommittees.map((sc) => (
            <option key={sc.id} value={sc.id}>{sc.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-600" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">ไม่พบหน่วยงาน</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{a.name}</p>
                  <p className="text-sm text-gray-500 font-mono">
                    user: <span className="font-semibold">{a.username}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.subCommittees.map((sc) => (
                      <Badge key={sc.subCommittee.id} variant="gray">
                        {sc.subCommittee.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyCredentials(a)}
                    title="คัดลอก credentials"
                  >
                    {copiedId === a.id ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(a.id, a.name)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
