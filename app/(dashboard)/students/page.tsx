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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  // TODO: Add amountPaid and balanceDue once the /api/students endpoint returns fee aggregates
  amountPaid?: number;
  balanceDue?: number;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStudentId, setPaymentStudentId] = useState<string | undefined>();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    withDueFees: 0,
  });

  // Filter state
  // TODO: Pass these filter values to load() once the /api/students endpoint supports them
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterSemester, setFilterSemester] = useState("fall-2024");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("2026-03-18");

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

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/students?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function refreshData(q = "") {
    await Promise.all([load(q), loadStats()]);
  }

  useEffect(() => {
    async function initialLoad() {
      const [studentsRes] = await Promise.all([
        fetch("/api/students?q="),
        loadStats(),
      ]);
      const data = await studentsRes.json();
      setStudents(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    initialLoad();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your students here
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

      {/* 3. Filters Section */}
      {/* TODO: Connect filter changes to load() once the API supports department/semester/status/date params */}
      <div className="flex items-center gap-6 rounded-lg border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-gray-600">
            Departments:
          </span>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="h-8 min-w-35 border-gray-200 text-sm">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="cs">Computer Science</SelectItem>
              <SelectItem value="eng">Engineering</SelectItem>
              <SelectItem value="bus">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-gray-600">
            Semester:
          </span>
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="h-8 min-w-30 border-gray-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fall-2024">Fall 2024</SelectItem>
              <SelectItem value="spring-2025">Spring 2025</SelectItem>
              <SelectItem value="fall-2025">Fall 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-gray-600">
            Status:
          </span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 min-w-20 border-gray-200 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-gray-600">Date:</span>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-8 w-35 border-gray-200 text-sm"
          />
        </div>
      </div>

      {/* 4. Data Table Section */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Enrolled Students
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                  No students found
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
                  {/* TODO: amountPaid and balanceDue come from fee aggregates; extend the
                      /api/students GET endpoint to include these totals per student */}
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
                            // TODO: Open edit fees/enrollment dialog for this student
                          }}
                        >
                          <Pencil className="h-4 w-4 text-gray-400" />
                          Edit Fees
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
