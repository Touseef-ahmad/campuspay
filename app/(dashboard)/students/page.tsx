"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Pencil,
  DollarSign,
  Archive,
  Trash2,
  Users,
  ChevronLeft,
  BookOpen,
} from "lucide-react";
import { EnrollStudentModal } from "@/components/enroll-student-modal";
import { AddStudentPaymentModal } from "@/components/add-student-payment-modal";

interface Student {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  department: string | null;
  status: string;
  amountPaid?: number;
  balanceDue?: number;
}

interface ProgramOffering {
  id: string;
  semesterNumber: number;
  status: string;
  program: {
    id: string;
    code: string;
    title: string;
    department: string | null;
  };
  term: {
    id: string;
    name: string;
  };
  _count?: {
    enrollments: number;
  };
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStudentId, setPaymentStudentId] = useState<
    string | undefined
  >();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    withDueFees: 0,
  });

  // Classroom view state
  const [programOfferings, setProgramOfferings] = useState<ProgramOffering[]>(
    [],
  );

  console.log("Program offerings with counts:", programOfferings);
  const [selectedClassroom, setSelectedClassroom] =
    useState<ProgramOffering | null>(null);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);

  async function loadStats() {
    try {
      const res = await fetch("/api/students/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          total: data.total ?? 0,
          active: data.active ?? 0,
          withDueFees: data.withDueFees ?? 0,
        });
      }
    } catch {
      // Keep default stats on error
    }
  }

  async function loadProgramOfferings() {
    setLoadingClassrooms(true);
    try {
      const res = await fetch("/api/program-offerings?includeCounts=true");
      const data = await res.json();
      setProgramOfferings(Array.isArray(data) ? data : []);
    } catch {
      setProgramOfferings([]);
    } finally {
      setLoadingClassrooms(false);
    }
  }

  async function load(q = "", classroomId?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classroomId) params.set("programOfferingId", classroomId);

    const res = await fetch(`/api/students?${params.toString()}`);
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function refreshData(q = "") {
    const classroomId = selectedClassroom?.id;
    await Promise.all([
      load(q, classroomId),
      loadStats(),
      loadProgramOfferings(),
    ]);
  }

  async function handleDelete(studentId: string, studentName: string) {
    if (!confirm(`Are you sure you want to delete ${studentName}?`)) return;

    const res = await fetch(`/api/students/${studentId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      refreshData(search);
    } else {
      const data = await res.json();
      if (data.code === "HAS_PAYMENTS") {
        const shouldArchive = confirm(
          `${data.message}\n\nWould you like to archive this student instead?`,
        );
        if (shouldArchive) {
          handleArchive(studentId);
        }
      } else {
        alert(data.error || "Failed to delete student");
      }
    }
  }

  async function handleArchive(studentId: string) {
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });

    if (res.ok) {
      refreshData(search);
    } else {
      alert("Failed to archive student");
    }
  }

  function handleSelectClassroom(classroom: ProgramOffering) {
    setSelectedClassroom(classroom);
    load("", classroom.id);
  }

  function handleBackToClassrooms() {
    setSelectedClassroom(null);
    setSearch("");
  }

  useEffect(() => {
    async function initialLoad() {
      await Promise.all([loadProgramOfferings(), loadStats()]);
      setLoading(false);
    }
    initialLoad();
  }, []);

  useEffect(() => {
    if (selectedClassroom) {
      const t = setTimeout(() => load(search, selectedClassroom.id), 300);
      return () => clearTimeout(t);
    }
  }, [search, selectedClassroom]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Show classroom selection view
  if (!selectedClassroom) {
    return (
      <div className="space-y-6">
        {/* 1. Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="mt-1 text-sm text-gray-500">
              Select a classroom to view enrolled students
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => {
                setPaymentStudentId(undefined);
                setPaymentModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Payment
            </Button>
            <Button
              className="gap-1 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Enroll New Student
            </Button>
            <EnrollStudentModal
              open={open}
              onOpenChange={setOpen}
              onSuccess={() => refreshData(search)}
            />
            <AddStudentPaymentModal
              open={paymentModalOpen}
              onOpenChange={setPaymentModalOpen}
              onSuccess={() => refreshData(search)}
              preselectedStudentId={paymentStudentId}
            />
          </div>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total No of Students", value: stats.total },
            { label: "Active Students", value: stats.active },
            { label: "Students with Due Fees", value: stats.withDueFees },
          ].map((card, i) => (
            <Card key={i} className="border bg-white">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3. Classrooms Grid */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Select a Classroom
          </h2>
          {loadingClassrooms ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              Loading classrooms...
            </div>
          ) : programOfferings.length === 0 ? (
            <Card className="border bg-white">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">No classrooms available</p>
                <p className="text-sm text-gray-400">
                  Create a class in the Programs page first
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {programOfferings.map((po) => (
                <Card
                  key={po.id}
                  className="cursor-pointer border bg-white transition-all hover:border-blue-300 hover:shadow-md"
                  onClick={() => handleSelectClassroom(po)}
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {po.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {po.program.code} - Semester {po.semesterNumber}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {po.program.title}
                    </p>
                    <p className="text-sm text-gray-400">{po.term.name}</p>
                    <div className="mt-4 flex items-center gap-1 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>
                        {po._count?.enrollments ?? 0} students enrolled
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show students in selected classroom
  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={handleBackToClassrooms}
            className="mb-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Classrooms
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedClassroom.program.code} - Semester{" "}
            {selectedClassroom.semesterNumber}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {selectedClassroom.program.title} • {selectedClassroom.term.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1"
            onClick={() => {
              setPaymentStudentId(undefined);
              setPaymentModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
          <Button
            className="gap-1 bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Enroll New Student
          </Button>
          <EnrollStudentModal
            open={open}
            onOpenChange={setOpen}
            onSuccess={() => refreshData(search)}
          />
          <AddStudentPaymentModal
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            onSuccess={() => refreshData(search)}
            preselectedStudentId={paymentStudentId}
          />
        </div>
      </div>

      {/* 2. Data Table Section */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Enrolled Students ({students.length})
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="h-8 w-56 rounded-full border-gray-200 pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Student ID
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Name
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Department
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Amount Paid
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Balance Due
              </TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wide text-gray-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-gray-400"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-gray-400"
                >
                  No students enrolled in this class
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/students/${s.id}`)}
                >
                  <TableCell className="font-mono text-sm text-gray-400">
                    {s.studentId ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {s.firstName} {s.lastName}
                  </TableCell>
                  <TableCell>
                    {s.department ? (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {s.department}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    {s.amountPaid != null ? formatCurrency(s.amountPaid) : "—"}
                  </TableCell>
                  <TableCell
                    className={
                      s.balanceDue != null
                        ? s.balanceDue > 0
                          ? "font-medium text-red-600"
                          : "font-medium text-green-600"
                        : "text-gray-400"
                    }
                  >
                    {s.balanceDue != null ? formatCurrency(s.balanceDue) : "—"}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-1 hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/students/${s.id}`)}
                        >
                          <Eye className="h-4 w-4 text-gray-400" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/students/${s.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4 text-gray-400" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setPaymentStudentId(s.id);
                            setPaymentModalOpen(true);
                          }}
                        >
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          Add Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(s.id)}>
                          <Archive className="h-4 w-4 text-gray-400" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() =>
                            handleDelete(s.id, `${s.firstName} ${s.lastName}`)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
