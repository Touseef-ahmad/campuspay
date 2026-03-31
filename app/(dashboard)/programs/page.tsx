"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";

type ProgramStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface ProgramOffering {
  id: string;
  semesterNumber: number;
  status: ProgramStatus;
  maxStudents: number | null;
  term: AcademicTerm;
}

interface Program {
  id: string;
  code: string;
  title: string;
  department: string | null;
  credits: number | null;
  totalSemesters: number | null;
  duration: string | null;
  status: ProgramStatus;
  programOfferings: ProgramOffering[];
  _count: { programOfferings: number };
}

const emptyForm = {
  code: "",
  title: "",
  department: "",
  credits: "",
  totalSemesters: "",
  duration: "",
  status: "ACTIVE" as ProgramStatus,
};

// Dynamically generate semester tag colors based on term name
function getSemesterTagColors(termName: string) {
  if (termName.toLowerCase().includes("fall")) {
    // Alternate between blue and green for fall semesters
    const year = parseInt(termName.match(/\d{4}/)?.[0] || "0");
    if (year % 2 === 0) {
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    }
    return {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    };
  }
  if (termName.toLowerCase().includes("spring")) {
    return {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
    };
  }
  if (termName.toLowerCase().includes("summer")) {
    return {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
    };
  }
  return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
}

function statusBadgeClass(status: ProgramStatus): string {
  if (status === "ACTIVE")
    return "bg-green-50 text-green-700 border border-green-200 font-semibold text-xs px-2.5 py-1 rounded-full";
  if (status === "INACTIVE")
    return "bg-yellow-50 text-yellow-700 border border-yellow-200 font-semibold text-xs px-2.5 py-1 rounded-full";
  return "bg-gray-100 text-gray-500 border border-gray-200 font-semibold text-xs px-2.5 py-1 rounded-full";
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  async function load() {
    setLoading(true);
    const [programsRes, termsRes] = await Promise.all([
      fetch("/api/programs"),
      fetch("/api/academic-terms"),
    ]);
    const programsData = await programsRes.json();
    const termsData = await termsRes.json();
    setPrograms(Array.isArray(programsData) ? programsData : []);
    setAcademicTerms(Array.isArray(termsData) ? termsData : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(p: Program) {
    setEditingId(p.id);
    setForm({
      code: p.code,
      title: p.title,
      department: p.department ?? "",
      credits: p.credits?.toString() ?? "",
      totalSemesters: p.totalSemesters?.toString() ?? "",
      duration: p.duration ?? "",
      status: p.status,
    });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code,
        title: form.title,
        status: form.status,
      };
      if (form.department) payload.department = form.department;
      if (form.credits) payload.credits = Number(form.credits);
      if (form.totalSemesters)
        payload.totalSemesters = Number(form.totalSemesters);
      if (form.duration) payload.duration = form.duration;
      if (editingId) payload.id = editingId;

      const res = await fetch("/api/programs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this program?")) return;
    const res = await fetch(`/api/programs?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Derive unique departments from loaded data for the filter dropdown.
  // TODO: Fetch from a dedicated /api/departments endpoint once available.
  const departments = Array.from(
    new Set(programs.map((p) => p.department).filter(Boolean)),
  ) as string[];

  // Client-side filtering until server-side filter params are supported.
  const filtered = programs.filter((p) => {
    if (filterDepartment !== "all" && p.department !== filterDepartment)
      return false;
    if (filterTerm !== "all") {
      const hasTermOffering = p.programOfferings.some(
        (o) => o.term.id === filterTerm,
      );
      if (!hasTermOffering) return false;
    }
    if (filterStatus !== "all" && p.status !== filterStatus.toUpperCase())
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Program Management
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage all your Programs here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* TODO: Implement billing cycle creation modal and API endpoint
              POST /api/billing-cycles once BillingCycle schema is defined. */}
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Billing cycle
          </Button>

          {/* TODO: Implement semester/academic term creation modal and API
              endpoint POST /api/academic-terms once AcademicTerm schema is defined. */}
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Create Semester
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openAdd}
                className="bg-[#007BFF] hover:bg-blue-600 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Program
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Program" : "Add New Program"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {/* Code + Title */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Program Code</Label>
                    <Input
                      value={form.code}
                      onChange={(e) =>
                        setField("code", e.target.value.toUpperCase())
                      }
                      required
                      placeholder="CS405"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Program Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      required
                      placeholder="Computer Science"
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => setField("department", e.target.value)}
                    placeholder="Department of Computer Science"
                  />
                </div>

                {/* Credits + Total Semesters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Credits</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.credits}
                      onChange={(e) => setField("credits", e.target.value)}
                      placeholder="140"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Semesters</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={form.totalSemesters}
                      onChange={(e) =>
                        setField("totalSemesters", e.target.value)
                      }
                      placeholder="8"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={form.duration}
                    onChange={(e) => setField("duration", e.target.value)}
                    placeholder="4 years"
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setField("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? "Saving…"
                      : editingId
                        ? "Update Program"
                        : "Add Program"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────── */}
      {/* TODO: Pass filter state as query params to /api/programs once the
          route supports server-side filtering (department, term, status). */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        {/* Department filter */}
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm font-medium text-gray-500">
            Departments:
          </span>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="h-8 w-44 border-gray-200 text-sm">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Academic Term filter */}
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm font-medium text-gray-500">
            Term:
          </span>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="h-8 w-36 border-gray-200 text-sm">
              <SelectValue placeholder="All Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {academicTerms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Status:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-28 border-gray-200 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Program Cards Grid ──────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-center shadow-sm">
          <p className="text-lg font-medium text-gray-700">No programs found</p>
          <p className="mt-1 text-sm text-gray-400">
            Add your first program or adjust filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Card Header: Code badge + Status badge */}
              <div className="flex items-center justify-between p-5 pb-0">
                <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-800">
                  {p.code}
                </span>
                <span className={statusBadgeClass(p.status)}>
                  {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                </span>
              </div>

              {/* Card Body: Program name + Department */}
              <div className="px-5 pt-3">
                <h3 className="text-lg font-bold leading-snug text-gray-900">
                  {p.title}
                </h3>
                {p.department && (
                  <p className="mt-0.5 text-sm text-gray-500">{p.department}</p>
                )}
              </div>

              {/* Academic Schedule Section */}
              <div className="px-5 pt-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Academic Schedule
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.programOfferings.length > 0 ? (
                    p.programOfferings.map((offering) => {
                      const colors = getSemesterTagColors(offering.term.name);
                      return (
                        <span
                          key={offering.id}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                        >
                          {offering.term.name} (Sem {offering.semesterNumber})
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      No semesters assigned
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <hr className="mx-5 mt-4 border-gray-100" />

              {/* Card Footer: Add Semester button + Edit/Delete icons */}
              <div className="flex items-center justify-between p-5 pt-4">
                {/* TODO: Implement "Add Semester" modal to assign existing academic
                    terms to this program via POST /api/program-offerings */}
                <Button
                  variant="default"
                  size="sm"
                  className="bg-[#007BFF] hover:bg-blue-600 text-white text-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Semester
                </Button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit program"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Delete program"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
