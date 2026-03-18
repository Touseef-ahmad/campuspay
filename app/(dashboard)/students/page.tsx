"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // TODO: Fetch KPI stats from a dedicated /api/students/stats endpoint
  const stats = { total: 48, active: 48, withDueFees: 48 };

  // Filter state
  // TODO: Pass these filter values to load() once the /api/students endpoint supports them
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterSemester, setFilterSemester] = useState("fall-2024");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("2026-03-18");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    department: "",
    enrollmentDate: "",
    academicYear: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/students?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close action dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add student");
        return;
      }
      setOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        department: "",
        enrollmentDate: "",
        academicYear: "",
      });
      load(search);
    } finally {
      setSaving(false);
    }
  }

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
          {/* TODO: Wire "Add Payment" to a payment creation flow */}
          <Button variant="outline" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1 bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Enroll New Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={form.department}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, department: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Computer Science",
                        "Engineering",
                        "Business",
                        "Arts",
                        "Science",
                        "Mathematics",
                        "Law",
                        "Medicine",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Enrollment Date</Label>
                  <Input
                    type="date"
                    value={form.enrollmentDate}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        enrollmentDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    placeholder="e.g. 2024-2025"
                    value={form.academicYear}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, academicYear: e.target.value }))
                    }
                  />
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
                    {saving ? "Saving…" : "Add Student"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      {/* TODO: Replace hardcoded values once /api/students/stats is implemented */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total No of Students", value: stats.total },
          { label: "Active Students", value: stats.active },
          { label: "Students with Due Fees", value: stats.withDueFees },
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
                    <div
                      className="relative inline-flex justify-end"
                      ref={openMenuId === s.id ? menuRef : undefined}
                    >
                      <button
                        className="rounded p-1 hover:bg-gray-100"
                        onClick={() =>
                          setOpenMenuId(openMenuId === s.id ? null : s.id)
                        }
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                      {openMenuId === s.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              router.push(`/students/${s.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 text-gray-400" />
                            View
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              router.push(`/students/${s.id}/edit`);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-gray-400" />
                            Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              // TODO: Open edit fees/enrollment dialog for this student
                              setOpenMenuId(null);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-gray-400" />
                            Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              // TODO: Open add payment dialog for this student
                              setOpenMenuId(null);
                            }}
                          >
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            Add Payment
                          </button>
                        </div>
                      )}
                    </div>
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
