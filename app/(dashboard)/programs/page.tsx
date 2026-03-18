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
import { Plus } from "lucide-react";

type CourseStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

// NOTE: The underlying schema model remains `Course` — only the UI terminology
// has changed from "Course" to "Program".
interface Program {
  id: string;
  code: string;
  title: string;
  department: string | null;
  credits: number | null;
  maxStudents: number | null;
  semester: string | null;
  duration: string | null;
  status: CourseStatus;
  _count: { enrollments: number };
}

const emptyForm = {
  code: "",
  title: "",
  department: "",
  credits: "",
  maxStudents: "",
  semester: "",
  duration: "",
  status: "ACTIVE" as CourseStatus,
};

// TODO: Replace with semester options fetched from the AcademicTerm API so the
// list stays in sync with actual terms instead of being hard-coded.
const SEMESTER_OPTIONS = [
  "Fall 2024",
  "Spring 2025",
  "Fall 2025",
  "Spring 2026",
];

function statusBadgeClass(status: CourseStatus): string {
  if (status === "ACTIVE")
    return "bg-green-50 text-green-700 border border-green-200 font-semibold text-xs px-2.5 py-1 rounded";
  if (status === "INACTIVE")
    return "bg-yellow-50 text-yellow-700 border border-yellow-200 font-semibold text-xs px-2.5 py-1 rounded";
  return "bg-gray-100 text-gray-500 border border-gray-200 font-semibold text-xs px-2.5 py-1 rounded";
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // TODO: Move filters to server-side query params once the /api/courses route
  // supports filtering by department, semester, status, and date.
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("2026-03-18");

  async function load() {
    setLoading(true);
    // NOTE: API route /api/courses is intentionally unchanged — schema stays as Course.
    const res = await fetch("/api/courses");
    const data = await res.json();
    setPrograms(Array.isArray(data) ? data : []);
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
      maxStudents: p.maxStudents?.toString() ?? "",
      semester: p.semester ?? "",
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
      if (form.maxStudents) payload.maxStudents = Number(form.maxStudents);
      if (form.semester) payload.semester = form.semester;
      if (form.duration) payload.duration = form.duration;
      if (editingId) payload.id = editingId;

      const res = await fetch("/api/courses", {
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
    const res = await fetch(`/api/courses?id=${id}`, { method: "DELETE" });
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
    if (filterSemester !== "all" && p.semester !== filterSemester) return false;
    if (filterStatus !== "all" && p.status !== filterStatus.toUpperCase())
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Program Management
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage all your Programs here
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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

              {/* Credits + Max Students */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.credits}
                    onChange={(e) => setField("credits", e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Students</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxStudents}
                    onChange={(e) => setField("maxStudents", e.target.value)}
                    placeholder="35"
                  />
                </div>
              </div>

              {/* Semester + Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input
                    value={form.semester}
                    onChange={(e) => setField("semester", e.target.value)}
                    placeholder="Fall 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={form.duration}
                    onChange={(e) => setField("duration", e.target.value)}
                    placeholder="16 weeks"
                  />
                </div>
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

      {/* ── Filters Bar ─────────────────────────────────────────── */}
      {/* TODO: Pass filter state as query params to /api/courses once the
          route supports server-side filtering (department, semester, status). */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 bg-white px-5 py-4">
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

        {/* Semester filter */}
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm font-medium text-gray-500">
            Semester:
          </span>
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="h-8 w-36 border-gray-200 text-sm">
              <SelectValue placeholder="Fall 2024" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {SEMESTER_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
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

        {/* Date filter */}
        {/* TODO: Clarify what this date filter represents (created date, start
            date, etc.) and wire it to the API once semantics are defined. */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Date:</span>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-8 w-36 border-gray-200 text-sm"
          />
        </div>
      </div>

      {/* ── Program Cards Grid ──────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-20 text-center">
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
              className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5"
            >
              {/* Code badge + Status badge */}
              <div className="flex items-center justify-between">
                <span className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-800">
                  {p.code}
                </span>
                <span className={statusBadgeClass(p.status)}>
                  {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                </span>
              </div>

              {/* Program name + Department */}
              <div>
                <h3 className="text-lg font-bold leading-snug text-gray-900">
                  {p.title}
                </h3>
                {p.department && (
                  <p className="mt-0.5 text-sm text-gray-500">{p.department}</p>
                )}
              </div>

              {/* Divider */}
              <hr className="border-gray-100" />

              {/* Semester + Duration */}
              <div className="flex items-center justify-between text-sm">
                <span>
                  <span className="text-gray-500">Semester: </span>
                  <span className="font-semibold text-gray-800">
                    {p.semester ?? "—"}
                  </span>
                </span>
                <span>
                  <span className="text-gray-500">Duration: </span>
                  <span className="font-semibold text-gray-800">
                    {p.duration ?? "—"}
                  </span>
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 rounded border border-gray-200 bg-white py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex-1 rounded border border-gray-200 bg-white py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
