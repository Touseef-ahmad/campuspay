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

interface Program {
  id: string;
  code: string;
  title: string;
  department: string | null;
}

interface AcademicTerm {
  id: string;
  name: string;
}

interface ProgramOffering {
  id: string;
  semesterNumber: number;
  status: string;
  program: Program;
  term: AcademicTerm;
}

interface EnrollStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const FEE_TYPES = [
  { value: "one_time", label: "One Time" },
  { value: "per_month", label: "Per Month" },
  { value: "per_semester", label: "Per Semester" },
  { value: "per_year", label: "Per Year" },
] as const;

// Default pre-populated fees
const DEFAULT_FEES: FeeItem[] = [
  { id: "tuition", name: "Tuition Fee", amount: "4500", type: "per_semester" },
  {
    id: "registration",
    name: "Registration Fee",
    amount: "500",
    type: "one_time",
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
  const [selectedProgramOffering, setSelectedProgramOffering] = useState("");
  const [fees, setFees] = useState<FeeItem[]>(DEFAULT_FEES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [programOfferings, setProgramOfferings] = useState<ProgramOffering[]>(
    [],
  );
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  // Fetch program offerings when modal opens
  useEffect(() => {
    if (open) {
      setLoadingOfferings(true);
      fetch("/api/program-offerings")
        .then((res) => res.json())
        .then((data) => {
          setProgramOfferings(Array.isArray(data) ? data : []);
        })
        .catch(() => setProgramOfferings([]))
        .finally(() => setLoadingOfferings(false));
    }
  }, [open]);

  // Group program offerings by program for better UI
  const groupedOfferings = useMemo(() => {
    const groups: Record<string, ProgramOffering[]> = {};
    programOfferings.forEach((po) => {
      const key = po.program.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(po);
    });
    return groups;
  }, [programOfferings]);

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
    setSelectedProgramOffering("");
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
      { id: crypto.randomUUID(), name: "", amount: "", type: "one_time" },
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

    // Validate program offering selection
    if (!selectedProgramOffering) {
      setError("Please select a class (program offering)");
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
          programOfferingId: selectedProgramOffering,
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
                Class & Fees
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
                <Select
                  value={form.academicYear}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, academicYear: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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

        {/* Step 2: Class & Fees */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Select Class <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedProgramOffering}
                onValueChange={setSelectedProgramOffering}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingOfferings ? "Loading classes..." : "Select a class"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {programOfferings.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No classes available. Create a class first.
                    </SelectItem>
                  ) : (
                    Object.entries(groupedOfferings).map(
                      ([programId, offerings]) => (
                        <div key={programId}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {offerings[0].program.title} (
                            {offerings[0].program.code})
                          </div>
                          {offerings.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                              {po.term.name} - Semester {po.semesterNumber}
                            </SelectItem>
                          ))}
                        </div>
                      ),
                    )
                  )}
                </SelectContent>
              </Select>
              {programOfferings.length === 0 && !loadingOfferings && (
                <p className="text-xs text-muted-foreground">
                  No classes found. Add a class to a program first from the
                  Programs page.
                </p>
              )}
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
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={fee.type}
                          onValueChange={(v) => updateFee(fee.id, "type", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {FEE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
