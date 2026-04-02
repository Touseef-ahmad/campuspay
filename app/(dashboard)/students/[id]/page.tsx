"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  PlusCircle,
  CreditCard,
  Pencil,
  FileText,
  User,
  BookOpen,
  DollarSign,
  History,
  Mail,
  Phone,
  MapPin,
  BadgeCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { StudentFeeModal } from "@/components/student-fee-modal";

interface StudentDetail {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  department: string | null;
  enrollmentDate: string | null;
  academicYear: string | null;
  status: string;
  enrollments: {
    id: string;
    course: { title: string; code: string };
    term: { name: string };
  }[];
  studentFees: {
    id: string;
    feeId: string;
    amountDue: number;
    amountPaid: number;
    status: string;
    dueDate: string;
    fee: { name: string };
    payments: {
      id: string;
      amountPaid: number;
      method: string;
      date: string;
    }[];
  }[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [fees, setFees] = useState<
    { id: string; name: string; defaultAmount: number; type: string }[]
  >([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Add fee modal state
  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [editFeeOpen, setEditFeeOpen] = useState(false);

  // Collect payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [payForm, setPayForm] = useState({
    amountPaid: "",
    method: "Cash",
    financialAccountId: "",
  });
  const [paySaving, setPaySaving] = useState(false);

  // Edit student dialog -- navigation handled by Link in Edit Profile button

  const [refreshKey, setRefreshKey] = useState(0);
  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const [sRes, fRes, aRes] = await Promise.all([
        fetch(`/api/students/${id}`),
        fetch("/api/fees"),
        fetch("/api/accounts"),
      ]);
      const [s, f, a] = await Promise.all([
        sRes.json(),
        fRes.json(),
        aRes.json(),
      ]);
      if (cancelled) return;
      setStudent(s);
      setFees(Array.isArray(f) ? f : []);
      setAccounts(Array.isArray(a) ? a : []);
      setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  async function handleCollectPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaySaving(true);
    await fetch(`/api/student-fees/${selectedFeeId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payForm,
        amountPaid: Number(payForm.amountPaid),
      }),
    });
    setPayOpen(false);
    setPayForm({ amountPaid: "", method: "Cash", financialAccountId: "" });
    refresh();
    setPaySaving(false);
  }

  if (loading) return <div className="text-muted-foreground p-8">Loading…</div>;
  if (!student)
    return <div className="text-destructive p-8">Student not found</div>;

  const initials =
    (student.firstName[0] ?? "").toUpperCase() +
    (student.lastName[0] ?? "").toUpperCase();

  const totalDue = student.studentFees.reduce(
    (sum, sf) => sum + Number(sf.amountDue),
    0,
  );
  const totalPaid = student.studentFees.reduce(
    (sum, sf) =>
      sum + sf.payments.reduce((s, p) => s + Number(p.amountPaid), 0),
    0,
  );

  // Flatten all payments for the payment history table
  const paymentHistory = student.studentFees.flatMap((sf) =>
    sf.payments.map((p) => ({
      id: p.id,
      date: p.date,
      description: sf.fee.name,
      amount: Number(p.amountPaid),
      method: p.method,
      status: "Paid" as const,
    })),
  );

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Link href="/dashboard" className="hover:text-gray-600">
              Home
            </Link>
            <span>/</span>
            <Link href="/students" className="hover:text-gray-600">
              Students
            </Link>
            <span>/</span>
            <span className="text-gray-500">Student Profile</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Student Profile
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/students/${id}/edit`}>
            <Button variant="outline" className="gap-1.5">
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
          {/* TODO: Wire to a report generation endpoint */}
          <Button variant="outline" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* 2. Top Profile Summary Card */}
      <Card className="border bg-white">
        <CardContent className="p-6">
          {/* Identity row */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-800">
              {initials}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {student.studentId ?? "—"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    student.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      student.status === "active"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />
                  {student.status === "active"
                    ? "Active Enrollment"
                    : student.status}
                </span>
              </div>
            </div>
          </div>

          {/* Contact info bar */}
          {/* TODO: Email, phone, address come from personalForm fields (not yet in schema).
              Wire these once the Student model is extended. */}
          <div className="mt-4 flex flex-wrap items-center gap-6 border-t pt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-gray-400" />
              {student.firstName.toLowerCase()}
              {student.lastName.toLowerCase()}@email.com
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-gray-400" />
              +92 331 123 4567
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              123 College Street, Model Town
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Three-column main grid */}
      <div className="grid grid-cols-3 gap-4 items-start">
        {/* Column 1: Personal + Academic info */}
        <div className="space-y-4">
          {/* Card A: Personal Information */}
          <Card className="border bg-white">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-gray-900">
                Personal Information
              </span>
            </div>
            <CardContent className="divide-y p-0">
              {/* TODO: dateOfBirth, gender, address, phoneNumber, emergencyContact* fields need
                  to be added to the Student schema before they can be read from `student`. */}
              {[
                { label: "DATE OF BIRTH", value: "June 15, 1997" },
                { label: "GENDER", value: "Female" },
                {
                  label: "ADDRESS",
                  value: student.department ? "On record" : "—",
                },
                { label: "PHONE", value: "+92 331 123 4567" },
                {
                  label: "EMAIL",
                  value: `${student.firstName.toLowerCase()}@email.com`,
                },
                {
                  label: "EMERGENCY CONTACT",
                  value: "Ali Ahmed (Father) · +92 300 000 0000",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </span>
                  <span className="text-sm text-gray-800">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Card B: Academic Information */}
          <Card className="border bg-white">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-gray-900">
                Academic Information
              </span>
            </div>
            <CardContent className="divide-y p-0">
              {/* TODO: programLevel, expectedGraduation, academicAdvisor, cgpa need schema additions */}
              {[
                { label: "DEPARTMENT", value: student.department ?? "—" },
                { label: "PROGRAM LEVEL", value: "Undergraduate" },
                { label: "ACADEMIC YEAR", value: student.academicYear ?? "—" },
                {
                  label: "ENROLLMENT DATE",
                  value: student.enrollmentDate
                    ? new Date(student.enrollmentDate).toLocaleDateString(
                        "en-US",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )
                    : "—",
                },
                { label: "EXPECTED GRADUATION", value: "May 2027" },
                { label: "ACADEMIC ADVISOR", value: "Dr. Sarah Khan" },
                { label: "CURRENT GPA", value: "3.85 / 4.0" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </span>
                  <span
                    className={`text-sm ${label === "CURRENT GPA" ? "font-bold text-gray-900" : "text-gray-800"}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Financial Summary */}
        <Card className="flex flex-col border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-gray-900">
                Financial Summary
              </span>
            </div>
            {/* Apply fee / collect payment dialogs */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setAddFeeOpen(true)}
              >
                <PlusCircle className="mr-1 h-3.5 w-3.5" />
                Add Fee
              </Button>

              {student.studentFees.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setEditFeeOpen(true)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}

              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <CreditCard className="mr-1 h-3.5 w-3.5" />
                    Collect
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Collect Payment</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={handleCollectPayment}
                    className="space-y-4 pt-2"
                  >
                    <div className="space-y-2">
                      <Label>Select Invoice</Label>
                      <Select
                        value={selectedFeeId}
                        onValueChange={setSelectedFeeId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                        <SelectContent>
                          {student.studentFees
                            .filter((f) => f.status !== "PAID")
                            .map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.fee.name} — {fmt(Number(f.amountDue))} (
                                {f.status})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={payForm.amountPaid}
                        onChange={(e) =>
                          setPayForm((p) => ({
                            ...p,
                            amountPaid: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select
                        value={payForm.method}
                        onValueChange={(v) =>
                          setPayForm((p) => ({ ...p, method: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Cash", "Bank Transfer", "Online", "Cheque"].map(
                            (m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Deposit to Account</Label>
                      <Select
                        value={payForm.financialAccountId}
                        onValueChange={(v) =>
                          setPayForm((p) => ({ ...p, financialAccountId: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPayOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={paySaving}>
                        {paySaving ? "Saving…" : "Record Payment"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <CardContent className="flex flex-1 flex-col gap-4 p-4">
            {/* KPI blocks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-xs text-red-500">Total Dues</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {fmt(totalDue)}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-green-600">Total Paid</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {fmt(totalPaid)}
                </p>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Fee Breakdown
              </p>
              {student.studentFees.length === 0 ? (
                <p className="text-sm text-gray-400">No fees assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {student.studentFees.map((sf) => {
                    const paid = sf.payments.reduce(
                      (s, p) => s + Number(p.amountPaid),
                      0,
                    );
                    const due = Number(sf.amountDue) - paid;
                    return (
                      <div
                        key={sf.id}
                        className="flex items-start justify-between text-sm"
                      >
                        <span className="text-gray-700">{sf.fee.name}</span>
                        <div className="text-right">
                          <span className="font-medium text-gray-900">
                            {fmt(Number(sf.amountDue))}
                          </span>
                          {paid > 0 && (
                            <p className="text-xs text-green-600">
                              paid {fmt(paid)}
                            </p>
                          )}
                          {due > 0 && (
                            <p className="text-xs text-red-500">
                              due {fmt(due)}
                            </p>
                          )}
                          {due <= 0 && paid > 0 && (
                            <p className="text-xs text-green-600">Paid</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary rows */}
            {/* TODO: billingCycle, totalTuition, installmentPlan fields need schema additions */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Billing Cycle</span>
                <span className="font-semibold text-gray-900">Semester</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Tuition</span>
                <span className="font-semibold text-gray-900">
                  {fmt(totalDue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Installment Plan</span>
                <span className="font-semibold text-gray-900">4 Payments</span>
              </div>
            </div>

            {/* Action button */}
            {/* TODO: Wire to a balance sheet download endpoint */}
            <Button className="mt-auto w-full bg-gray-900 text-white hover:bg-gray-800">
              Generate Balance Sheet
            </Button>
          </CardContent>
        </Card>

        {/* Column 3: Payment History */}
        <Card className="border bg-white">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <History className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-900">Payment History</span>
          </div>
          <CardContent className="p-0">
            {paymentHistory.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">
                No payments recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Description
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {p.description}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {fmt(p.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pending fees shown as pending rows */}
            {student.studentFees.some((sf) => sf.status !== "PAID") && (
              <Table>
                <TableBody>
                  {student.studentFees
                    .filter((sf) => sf.status !== "PAID")
                    .map((sf) => (
                      <TableRow key={sf.id}>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(sf.dueDate).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {sf.fee.name}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-900">
                          {fmt(Number(sf.amountDue))}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Fee Modal */}
      <StudentFeeModal
        open={addFeeOpen}
        onOpenChange={setAddFeeOpen}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
        }}
        feeTemplates={fees}
        mode="add"
        onSuccess={refresh}
      />

      {/* Edit Fees Modal */}
      <StudentFeeModal
        open={editFeeOpen}
        onOpenChange={setEditFeeOpen}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
        }}
        feeTemplates={fees}
        mode="edit"
        existingFees={student.studentFees.map((sf) => ({
          id: sf.id,
          feeId: sf.feeId,
          amountDue: Number(sf.amountDue),
          amountPaid: Number(sf.amountPaid),
          fee: sf.fee,
        }))}
        onSuccess={refresh}
      />
    </div>
  );
}
