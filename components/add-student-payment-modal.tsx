"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, User } from "lucide-react";

interface Student {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  department: string | null;
}

interface StudentFee {
  id: string;
  feeId: string;
  feeName: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: string;
}

interface PaymentLineItem {
  id: string;
  studentFeeId: string;
  amount: string;
}

interface AddStudentPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedStudentId?: string;
}

export function AddStudentPaymentModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedStudentId,
}: AddStudentPaymentModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [paymentItems, setPaymentItems] = useState<PaymentLineItem[]>([
    { id: crypto.randomUUID(), studentFeeId: "", amount: "" },
  ]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loadingFees, setLoadingFees] = useState(false);

  // Fetch students for search
  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch(
          `/api/students?q=${encodeURIComponent(searchQuery)}`,
        );
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      } catch {
        setStudents([]);
      }
    }
    if (open) {
      fetchStudents();
    }
  }, [open, searchQuery]);

  // Handle preselected student
  useEffect(() => {
    async function fetchPreselectedStudent() {
      if (preselectedStudentId && open) {
        try {
          const res = await fetch(`/api/students/${preselectedStudentId}`);
          if (res.ok) {
            const student = await res.json();
            setSelectedStudent(student);
          }
        } catch {
          // Handle error silently
        }
      }
    }
    fetchPreselectedStudent();
  }, [preselectedStudentId, open]);

  // Fetch student fees when student is selected
  useEffect(() => {
    async function fetchStudentFees() {
      if (!selectedStudent) {
        setStudentFees([]);
        return;
      }

      setLoadingFees(true);
      try {
        const res = await fetch(`/api/students/${selectedStudent.id}/fees`);
        if (res.ok) {
          const fees = await res.json();
          // Only show fees with outstanding balance
          setStudentFees(fees.filter((f: StudentFee) => f.balance > 0));
        }
      } catch {
        setStudentFees([]);
      } finally {
        setLoadingFees(false);
      }
    }
    fetchStudentFees();
  }, [selectedStudent]);

  function resetForm() {
    setSelectedStudent(null);
    setStudentFees([]);
    setPaymentItems([
      { id: crypto.randomUUID(), studentFeeId: "", amount: "" },
    ]);
    setSearchQuery("");
    setError("");
    setIsSearchOpen(false);
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
    if (!isOpen) resetForm();
  }

  function addPaymentItem() {
    setPaymentItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), studentFeeId: "", amount: "" },
    ]);
  }

  function updatePaymentItem(
    id: string,
    field: keyof PaymentLineItem,
    value: string,
  ) {
    setPaymentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function removePaymentItem(id: string) {
    setPaymentItems((prev) => prev.filter((item) => item.id !== id));
  }

  // Get selected fee details for showing balance
  function getSelectedFee(studentFeeId: string): StudentFee | undefined {
    return studentFees.find((f) => f.id === studentFeeId);
  }

  // Calculate total payment amount
  const totalAmount = useMemo(() => {
    return paymentItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  }, [paymentItems]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  async function handleProcessPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedStudent) {
      setError("Please select a student");
      return;
    }

    const validPayments = paymentItems.filter(
      (item) => item.studentFeeId && parseFloat(item.amount) > 0,
    );

    if (validPayments.length === 0) {
      setError("Please add at least one payment with a valid amount");
      return;
    }

    // Validate amounts don't exceed balances
    for (const payment of validPayments) {
      const fee = getSelectedFee(payment.studentFeeId);
      if (fee && parseFloat(payment.amount) > fee.balance) {
        setError(
          `Payment for ${fee.feeName} exceeds the remaining balance of ${formatCurrency(fee.balance)}`,
        );
        return;
      }
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          payments: validPayments.map((p) => ({
            studentFeeId: p.studentFeeId,
            amount: parseFloat(p.amount),
          })),
          method: "cash",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to process payment");
        return;
      }

      handleOpenChange(false);
      onSuccess?.();
    } finally {
      setProcessing(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(query) ||
      s.lastName.toLowerCase().includes(query) ||
      (s.studentId?.toLowerCase().includes(query) ?? false)
    );
  });

  // Get fees that haven't been selected yet in other payment items
  const getAvailableFees = (currentItemId: string) => {
    const selectedFeeIds = paymentItems
      .filter((item) => item.id !== currentItemId && item.studentFeeId)
      .map((item) => item.studentFeeId);
    return studentFees.filter((fee) => !selectedFeeIds.includes(fee.id));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Student Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleProcessPayment} className="space-y-6">
          {/* Student Selection Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-900">
              Select Student
            </Label>

            {!selectedStudent ? (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search by name or student ID..."
                    className="pl-10"
                  />
                </div>

                {/* Search Results Dropdown */}
                {isSearchOpen && searchQuery && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
                    {filteredStudents.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No students found
                      </div>
                    ) : (
                      filteredStudents.slice(0, 5).map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsSearchOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {student.studentId ?? "No ID"} •{" "}
                              {student.department ?? "No Department"}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Student Card */
              <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Student ID: {selectedStudent.studentId ?? "—"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null);
                    setPaymentItems([
                      { id: crypto.randomUUID(), studentFeeId: "", amount: "" },
                    ]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Fee Payment Line Items Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-900">
              Fee Payments
            </Label>

            {loadingFees ? (
              <p className="text-sm text-gray-500">Loading fees...</p>
            ) : selectedStudent && studentFees.length === 0 ? (
              <p className="text-sm italic text-gray-500">
                No outstanding fees for this student.
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {paymentItems.map((item) => {
                    const selectedFee = getSelectedFee(item.studentFeeId);
                    const availableFees = getAvailableFees(item.id);

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border bg-white p-3"
                      >
                        <div className="flex items-end gap-3">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-gray-500">
                              Select Fee
                            </Label>
                            <Select
                              value={item.studentFeeId}
                              onValueChange={(v) =>
                                updatePaymentItem(item.id, "studentFeeId", v)
                              }
                              disabled={!selectedStudent}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select a fee" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFees.map((fee) => (
                                  <SelectItem key={fee.id} value={fee.id}>
                                    {fee.feeName} (Balance:{" "}
                                    {formatCurrency(fee.balance)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32 space-y-1">
                            <Label className="text-xs text-gray-500">
                              Amount ($)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              max={selectedFee?.balance}
                              value={item.amount}
                              onChange={(e) =>
                                updatePaymentItem(
                                  item.id,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              placeholder="0.00"
                              className="h-10"
                              disabled={!item.studentFeeId}
                            />
                          </div>
                          {paymentItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePaymentItem(item.id)}
                              className="h-10 w-10 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {selectedFee && (
                          <div className="mt-2 flex justify-between text-xs text-gray-500">
                            <span>
                              Total Due: {formatCurrency(selectedFee.amountDue)}
                            </span>
                            <span>
                              Paid: {formatCurrency(selectedFee.amountPaid)}
                            </span>
                            <span className="font-medium text-orange-600">
                              Balance: {formatCurrency(selectedFee.balance)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedStudent && studentFees.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPaymentItem}
                    className="gap-1 text-blue-600 hover:text-blue-700"
                    disabled={paymentItems.length >= studentFees.length}
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Fee Payment
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Total Section */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Total Payment
              </span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Action Button */}
          <Button
            type="submit"
            disabled={processing || !selectedStudent || totalAmount <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {processing ? "Processing…" : "Process Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
