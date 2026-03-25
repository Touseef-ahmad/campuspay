"use client";

import { useState } from "react";
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

interface CustomFee {
  id: string;
  label: string;
  billingCycle: string;
  amount: string;
}

interface EnrollStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

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
  const [customFees, setCustomFees] = useState<CustomFee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setForm({
      firstName: "",
      lastName: "",
      enrollmentDate: "",
      academicYear: "",
    });
    setStep(1);
    setSelectedProgram("");
    setCustomFees([]);
    setError("");
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
    if (!isOpen) resetForm();
  }

  function addCustomFee() {
    setCustomFees((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", billingCycle: "", amount: "" },
    ]);
  }

  function updateCustomFee(id: string, field: keyof CustomFee, value: string) {
    setCustomFees((prev) =>
      prev.map((fee) => (fee.id === id ? { ...fee, [field]: value } : fee)),
    );
  }

  function removeCustomFee(id: string) {
    setCustomFees((prev) => prev.filter((fee) => fee.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // TODO: Include selectedProgram and customFees in the API payload
      // TODO: Create enrollment record with associated fees
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          program: selectedProgram,
          customFees: customFees.map((f) => ({
            label: f.label,
            billingCycle: f.billingCycle,
            amount: parseFloat(f.amount) || 0,
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
              <Label>Select Program</Label>
              <Select
                value={selectedProgram}
                onValueChange={setSelectedProgram}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: Fetch programs from /api/programs endpoint */}
                  <SelectItem value="cs-bachelor">
                    Bachelor of Computer Science
                  </SelectItem>
                  <SelectItem value="cs-master">
                    Master of Computer Science
                  </SelectItem>
                  <SelectItem value="business-bachelor">
                    Bachelor of Business Administration
                  </SelectItem>
                  <SelectItem value="engineering-bachelor">
                    Bachelor of Engineering
                  </SelectItem>
                  <SelectItem value="arts-bachelor">
                    Bachelor of Arts
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mandatory Fees Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Mandatory Fees
              </h3>
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Tuition</span>
                  <span className="text-sm font-medium text-gray-900">
                    $4,500.00
                  </span>
                </div>
                <div className="flex items-center justify-between border-t py-2">
                  <span className="text-sm text-gray-700">Registration</span>
                  <span className="text-sm font-medium text-gray-900">
                    $500.00
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold text-gray-900">
                    Total Mandatory
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    $5,000.00
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Fee Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Custom Fees
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomFee}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Additional Fee
                </Button>
              </div>

              {customFees.length === 0 ? (
                <p className="text-sm italic text-gray-500">
                  No custom fees added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {customFees.map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-end gap-3 rounded-lg border bg-white p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Fee Label</Label>
                        <Input
                          value={fee.label}
                          onChange={(e) =>
                            updateCustomFee(fee.id, "label", e.target.value)
                          }
                          placeholder="e.g., Lab Fee"
                          className="h-9"
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Billing Cycle</Label>
                        <Select
                          value={fee.billingCycle}
                          onValueChange={(v) =>
                            updateCustomFee(fee.id, "billingCycle", v)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* TODO: Fetch billing cycles from API or config */}
                            <SelectItem value="one-time">One-time</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semester">
                              Per Semester
                            </SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fee.amount}
                          onChange={(e) =>
                            updateCustomFee(fee.id, "amount", e.target.value)
                          }
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomFee(fee.id)}
                        className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
