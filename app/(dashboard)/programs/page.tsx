"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { CreateSemesterModal } from "@/components/create-semester-modal";
import { ProgramModal, AddProgramButton } from "@/components/program-modal";
import { AddClassModal } from "@/components/add-class-modal";
import { DeleteProgramModal } from "@/components/delete-program-modal";
import { InitializeBillingModal } from "@/components/initialize-billing-modal";

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

// Dynamically generate semester tag colors based on term name
function getSemesterTagColors(termName: string) {
  if (termName.toLowerCase().includes("fall")) {
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
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);

  // Filters
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Edit modal state
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Delete modal state
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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

  function openEdit(p: Program) {
    setEditingProgram(p);
    setEditModalOpen(true);
  }

  function openDelete(p: Program) {
    setDeletingProgram(p);
    setDeleteModalOpen(true);
  }

  // Derive unique departments from loaded data
  const departments = Array.from(
    new Set(programs.map((p) => p.department).filter(Boolean)),
  ) as string[];

  // Client-side filtering
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
          <InitializeBillingModal onInitialized={load} />

          <CreateSemesterModal onCreated={load} />

          <AddProgramButton onSaved={load} />
        </div>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────── */}
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

              {/* Card Footer: Add Class button + Edit/Delete icons */}
              <div className="flex items-center justify-between p-5 pt-4">
                <AddClassModal
                  programId={p.id}
                  programCode={p.code}
                  totalSemesters={p.totalSemesters}
                  onCreated={load}
                />

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit program"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openDelete(p)}
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

      {/* Edit Program Modal */}
      <ProgramModal
        program={editingProgram}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSaved={load}
      />

      {/* Delete Program Modal */}
      <DeleteProgramModal
        program={deletingProgram}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onDeleted={load}
      />
    </div>
  );
}
