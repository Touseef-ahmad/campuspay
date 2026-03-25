"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Plus, Check, Trash2 } from "lucide-react";

interface FeeItem {
  id: string;
  name: string;
  amount: string;
  type: string;
}

interface Course {
  id: string;
  code: string;
  title: string;
  department: string | null;
}

interface EnrollStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Default pre-populated fees
const DEFAULT_FEES: FeeItem[] = [
  { id: "tuition", name: "Tuition Fee", amount: "4500", type: "tuition" },
  {
    id: "registration",
    name: "Registration Fee",
    amount: "500",
    type: "registration",
  },
];

export function EnrollStudentModal({
  open,
  onOpenChange,
  onSuccess,
}: EnrollStudentModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    enrollmentDate: "",
    academicYear: "",
  });
  const [selectedProgram, setSelectedProgram] = useState("");
  const [fees, setFees] = useState<FeeItem[]>(DEFAULT_FEES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Fetch courses when modal opens
  useEffect(() => {
    if (open) {
      setLoadingCourses(true);
      fetch("/api/courses")
        .then((res) => res.json())
        .then((data) => {
          setCourses(Array.isArray(data) ? data : []);
        })
        .catch(() => setCourses([]))
        .finally(() => setLoadingCourses(false));
    }
  }, [open]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return fees.reduce((sum, fee) => {
      const amount = parseFloat(fee.amount) || 0;
      return sum + amount;
    }, 0);
  }, [fees]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function resetForm() {
    setForm({
      firstName: "",
      lastName: "",
      enrollmentDate: "",
      academicYear: "",
    });
    setStep(1);
    setSelectedProgram("");
    setFees([...DEFAULT_FEES]);
    setError("");
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
    if (!isOpen) resetForm();
  }

  function addFee() {
    setFees((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", amount: "", type: "custom" },
    ]);
  }

  function updateFee(id: string, field: keyof FeeItem, value: string) {
    setFees((prev) =>
      prev.map((fee) => (fee.id === id ? { ...fee, [field]: value } : fee)),
    );
  }

  function removeFee(id: string) {
    setFees((prev) => prev.filter((fee) => fee.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate program selection
    if (!selectedProgram) {
      setError("Please select a program");
      return;
    }

    // Validate at least one fee with valid amount
    const validFees = fees.filter(
      (f) => f.name.trim() && parseFloat(f.amount) > 0,
    );

    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          courseId: selectedProgram,
          fees: validFees.map((f) => ({
            name: f.name,
            amount: parseFloat(f.amount),
            type: f.type,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add student");
        return;
      }
      handleOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enroll New Student</DialogTitle>
        </DialogHeader>

        {/* Progress Stepper */}
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  step > 1
                    ? "bg-green-500 text-white"
                    : step === 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > 1 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">1</span>
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  step >= 1 ? "text-gray-900" : "text-gray-500"
                }`}
              >
                Student Details
              </span>
            </div>

            {/* Connector */}
            <div
              className={`mx-2 h-0.5 w-16 ${
                step > 1 ? "bg-green-500" : "bg-gray-200"
              }`}
            />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  step === 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                <span className="text-sm font-medium">2</span>
              </div>
              <span
                className={`text-sm font-medium ${
                  step === 2 ? "text-gray-900" : "text-gray-500"
                }`}
              >
                Program & Fees
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: Student Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                  type="date"
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, academicYear: e.target.value }))
                  }
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (!form.firstName.trim() || !form.lastName.trim()) {
                    setError("First Name and Last Name are required");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Program & Fees */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Select Program <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedProgram}
                onValueChange={setSelectedProgram}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingCourses
                        ? "Loading programs..."
                        : "Select a program"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No programs available
                    </SelectItem>
                  ) : (
                    courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title} ({course.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Fees Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Enrollment Fees
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFee}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Fee
                </Button>
              </div>

              {fees.length === 0 ? (
                <p className="text-sm italic text-gray-500">
                  No fees added. Click &quot;Add Fee&quot; to add enrollment
                  fees.
                </p>
              ) : (
                <div className="space-y-3">
                  {fees.map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-end gap-3 rounded-lg border bg-white p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Fee Name</Label>
                        <Input
                          value={fee.name}
                          onChange={(e) =>
                            updateFee(fee.id, "name", e.target.value)
                          }
                          placeholder="e.g., Tuition Fee"
                          className="h-9"
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs">Amount ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fee.amount}
                          onChange={(e) =>
                            updateFee(fee.id, "amount", e.target.value)
                          }
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFee(fee.id)}
                        className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Section */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Total Fees
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? "Saving…" : "Complete Enrollment"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
