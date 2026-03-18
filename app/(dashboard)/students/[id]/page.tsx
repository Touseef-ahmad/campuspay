"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ArrowLeft, PlusCircle, CreditCard, Pencil } from "lucide-react";
import Link from "next/link";

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
    amountDue: number;
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

function statusVariant(s: string): "success" | "destructive" | "secondary" {
  if (s === "PAID") return "success";
  if (s === "PARTIAL") return "secondary";
  return "destructive";
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [fees, setFees] = useState<
    { id: string; name: string; defaultAmount: number }[]
  >([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply fee dialog
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    feeId: "",
    amountDue: "",
    dueDate: "",
  });
  const [applySaving, setApplySaving] = useState(false);

  // Collect payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [payForm, setPayForm] = useState({
    amountPaid: "",
    method: "Cash",
    financialAccountId: "",
  });
  const [paySaving, setPaySaving] = useState(false);

  // Edit student dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    department: "",
    enrollmentDate: "",
    academicYear: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
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
    setStudent(s);
    setFees(Array.isArray(f) ? f : []);
    setAccounts(Array.isArray(a) ? a : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleApplyFee(e: React.FormEvent) {
    e.preventDefault();
    setApplySaving(true);
    await fetch(`/api/students/${id}/fees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...applyForm,
        amountDue: Number(applyForm.amountDue),
      }),
    });
    setApplyOpen(false);
    setApplyForm({ feeId: "", amountDue: "", dueDate: "" });
    await load();
    setApplySaving(false);
  }

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
    await load();
    setPaySaving(false);
  }

  function openEditDialog() {
    if (!student) return;
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      department: student.department ?? "",
      enrollmentDate: student.enrollmentDate
        ? new Date(student.enrollmentDate).toISOString().split("T")[0]
        : "",
      academicYear: student.academicYear ?? "",
    });
    setEditOpen(true);
  }

  async function handleEditStudent(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditOpen(false);
    await load();
    setEditSaving(false);
  }

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!student)
    return <div className="text-destructive">Student not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {student.firstName} {student.lastName}
          </h1>
          <Badge
            variant={student.status === "active" ? "success" : "secondary"}
          >
            {student.status}
          </Badge>
        </div>
      </div>

      {/* Student Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Information</CardTitle>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Student Information</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditStudent} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="First name"
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          firstName: e.target.value,
                        }))
                      }
                      required
                    />
                    <Input
                      placeholder="Last name"
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input value={student.studentId ?? ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated upon save
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select
                    value={editForm.department}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, department: v }))
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
                  <Label>Enrollment Date *</Label>
                  <Input
                    type="date"
                    value={editForm.enrollmentDate}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        enrollmentDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    placeholder="e.g. 2024-2025"
                    value={editForm.academicYear}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        academicYear: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editSaving}>
                    {editSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">
                {student.firstName} {student.lastName}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Student ID</p>
              <p className="font-mono text-sm">{student.studentId ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{student.department ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Enrollment Date</p>
              <p className="font-medium">
                {student.enrollmentDate
                  ? new Date(student.enrollmentDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Academic Year</p>
              <p className="font-medium">{student.academicYear ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                variant={student.status === "active" ? "success" : "secondary"}
              >
                {student.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financials">
        <TabsList>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        <TabsContent value="academics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {student.enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No enrollments yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Term</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.course.title}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {e.course.code}
                        </TableCell>
                        <TableCell>{e.term.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="mt-4 space-y-4">
          <div className="flex gap-2">
            {/* Apply Fee */}
            <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Apply Fee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apply Fee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleApplyFee} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Fee Template</Label>
                    <Select
                      value={applyForm.feeId}
                      onValueChange={(v) => {
                        const fee = fees.find((f) => f.id === v);
                        setApplyForm((p) => ({
                          ...p,
                          feeId: v,
                          amountDue: fee ? String(fee.defaultAmount) : "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee" />
                      </SelectTrigger>
                      <SelectContent>
                        {fees.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} — {fmt(f.defaultAmount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Due</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={applyForm.amountDue}
                      onChange={(e) =>
                        setApplyForm((p) => ({
                          ...p,
                          amountDue: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={applyForm.dueDate}
                      onChange={(e) =>
                        setApplyForm((p) => ({ ...p, dueDate: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setApplyOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={applySaving}>
                      {applySaving ? "Saving…" : "Apply Fee"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Collect Payment */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Collect Payment
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

          {/* Fee list */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {student.studentFees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No fees assigned yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.studentFees.map((sf) => {
                      const paid = sf.payments.reduce(
                        (s, p) => s + Number(p.amountPaid),
                        0,
                      );
                      return (
                        <TableRow key={sf.id}>
                          <TableCell>{sf.fee.name}</TableCell>
                          <TableCell>{fmt(Number(sf.amountDue))}</TableCell>
                          <TableCell>{fmt(paid)}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(sf.status)}>
                              {sf.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(sf.dueDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
