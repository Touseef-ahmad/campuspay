"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import { Plus, Trash2, CheckCircle, Lock } from "lucide-react";

interface FeeTemplate {
  id: string;
  name: string;
  defaultAmount: number;
  type: string;
}

interface ExistingFee {
  id: string;
  feeId: string;
  amountDue: number;
  amountPaid: number;
  fee: { name: string };
}

interface FeeLineItem {
  localId: string;
  feeId: string;
  feeName: string;
  amount: string;
  amountPaid: number;
  isExisting: boolean;
  existingFeeId?: string;
  isDeleted?: boolean; // Track if an existing item should be deleted
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
}

interface StudentFeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentInfo;
  feeTemplates: FeeTemplate[];
  existingFees?: ExistingFee[];
  mode?: "add" | "edit";
  onSuccess?: () => void;
}

export function StudentFeeModal({
  open,
  onOpenChange,
  student,
  feeTemplates,
  existingFees = [],
  mode = "add",
  onSuccess,
}: StudentFeeModalProps) {
  const [lineItems, setLineItems] = useState<FeeLineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  // Track original fees for comparison
  const originalFeesRef = useRef<
    Map<string, { feeId: string; amount: number }>
  >(new Map());

  // Initialize line items when modal opens
  useEffect(() => {
    if (open) {
      setError("");
      setShowSuccess(false);

      if (mode === "edit" && existingFees.length > 0) {
        // Edit mode: populate with existing fees
        const items: FeeLineItem[] = existingFees.map((ef) => ({
          localId: ef.id,
          feeId: ef.feeId,
          feeName: ef.fee.name,
          amount: String(ef.amountDue),
          amountPaid: ef.amountPaid,
          isExisting: true,
          existingFeeId: ef.id,
        }));
        setLineItems(items);

        // Store original state for comparison
        const origMap = new Map<string, { feeId: string; amount: number }>();
        existingFees.forEach((ef) => {
          origMap.set(ef.id, { feeId: ef.feeId, amount: ef.amountDue });
        });
        originalFeesRef.current = origMap;
      } else {
        // Add mode: start with one empty line
        setLineItems([
          {
            localId: crypto.randomUUID(),
            feeId: "",
            feeName: "",
            amount: "",
            amountPaid: 0,
            isExisting: false,
          },
        ]);
        originalFeesRef.current = new Map();
      }
    }
  }, [open, mode, existingFees]);

  const initials =
    (student.firstName[0] ?? "").toUpperCase() +
    (student.lastName[0] ?? "").toUpperCase();

  const isEditMode = mode === "edit";

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        feeId: "",
        feeName: "",
        amount: "",
        amountPaid: 0,
        isExisting: false,
      },
    ]);
  }

  function updateLineItem(
    localId: string,
    field: keyof FeeLineItem,
    value: string | number,
  ) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.localId !== localId) return item;

        // If selecting a fee, auto-populate the amount and name
        if (field === "feeId" && typeof value === "string") {
          const template = feeTemplates.find((f) => f.id === value);
          return {
            ...item,
            feeId: value,
            feeName: template?.name ?? "",
            amount: template ? String(template.defaultAmount) : item.amount,
          };
        }

        return { ...item, [field]: value };
      }),
    );
  }

  function removeLineItem(localId: string) {
    setLineItems((prev) => {
      const item = prev.find((i) => i.localId === localId);
      if (!item) return prev;

      // For existing items, mark as deleted instead of removing
      if (item.isExisting && item.existingFeeId) {
        return prev.map((i) =>
          i.localId === localId ? { ...i, isDeleted: true } : i,
        );
      }

      // For new items, just remove
      return prev.filter((i) => i.localId !== localId);
    });
  }

  function restoreLineItem(localId: string) {
    setLineItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, isDeleted: false } : i)),
    );
  }

  // Get active (non-deleted) line items
  const activeLineItems = lineItems.filter((item) => !item.isDeleted);
  const deletedLineItems = lineItems.filter((item) => item.isDeleted);

  // Calculate total
  const totalAmount = useMemo(() => {
    return activeLineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  }, [activeLineItems]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Get valid new items (have fee selected and amount > 0)
    const newItems = activeLineItems.filter(
      (item) => !item.isExisting && item.feeId && parseFloat(item.amount) > 0,
    );

    // Get modified existing items
    const modifiedItems = activeLineItems.filter((item) => {
      if (!item.isExisting || !item.existingFeeId) return false;
      const original = originalFeesRef.current.get(item.existingFeeId);
      if (!original) return false;
      return parseFloat(item.amount) !== original.amount;
    });

    // Get items to delete
    const itemsToDelete = deletedLineItems.filter(
      (item) => item.isExisting && item.existingFeeId,
    );

    // Validate: need at least one valid item in add mode
    if (mode === "add" && newItems.length === 0) {
      setError("Please add at least one fee with a valid amount");
      return;
    }

    // Check there's something to do in edit mode
    if (
      mode === "edit" &&
      newItems.length === 0 &&
      modifiedItems.length === 0 &&
      itemsToDelete.length === 0
    ) {
      setError("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const promises: Promise<Response>[] = [];

      // Create new fees
      newItems.forEach((item) => {
        promises.push(
          fetch(`/api/students/${student.id}/fees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              feeId: item.feeId,
              amountDue: parseFloat(item.amount),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            }),
          }),
        );
      });

      // Update modified fees
      modifiedItems.forEach((item) => {
        promises.push(
          fetch("/api/student-fees", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.existingFeeId,
              amountDue: parseFloat(item.amount),
            }),
          }),
        );
      });

      // Delete removed fees
      itemsToDelete.forEach((item) => {
        promises.push(
          fetch(`/api/student-fees?id=${item.existingFeeId}`, {
            method: "DELETE",
          }),
        );
      });

      const results = await Promise.all(promises);

      // Check for errors
      const hasError = results.some((r) => !r.ok);
      if (hasError) {
        setError("Some operations failed. Please refresh and try again.");
        return;
      }

      // Show success state
      setShowSuccess(true);
      onSuccess?.();

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch {
      setError("Failed to save fees");
    } finally {
      setSaving(false);
    }
  }

  // Check if the button should be disabled
  const isSubmitDisabled =
    saving ||
    (mode === "add" &&
      activeLineItems.every(
        (item) => !item.feeId || !item.amount || parseFloat(item.amount) <= 0,
      ));

  const successMessage = isEditMode
    ? "Fees Updated Successfully"
    : "Fees Added Successfully";
  const titleText = isEditMode ? "Edit Fees" : "Add Fee Payment";
  const submitText = isEditMode
    ? saving
      ? "Updating..."
      : "Update"
    : saving
      ? "Adding..."
      : "Add Payment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {/* Success State */}
        {showSuccess ? (
          <div
            className="flex flex-col items-center justify-center py-12 cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              {successMessage}
            </h2>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{titleText}</DialogTitle>
            </DialogHeader>

            {/* Student Identity Card */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                {initials}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {student.studentId ?? "No ID"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Line Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activeLineItems.map((item) => (
                  <div
                    key={item.localId}
                    className="flex items-end gap-2 rounded-lg border bg-white p-3"
                  >
                    {/* Fee Select */}
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Select Fee</Label>
                      {item.isExisting ? (
                        // Show fee name as text for existing fees
                        <div className="h-9 flex items-center px-3 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700">
                          {item.feeName}
                        </div>
                      ) : (
                        <Select
                          value={item.feeId}
                          onValueChange={(v) =>
                            updateLineItem(item.localId, "feeId", v)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Choose fee type" />
                          </SelectTrigger>
                          <SelectContent>
                            {feeTemplates.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name} ({formatCurrency(f.defaultAmount)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          updateLineItem(item.localId, "amount", e.target.value)
                        }
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>

                    {/* Delete/Lock Button */}
                    {item.amountPaid > 0 ? (
                      <div
                        className="h-9 w-9 flex items-center justify-center text-gray-300"
                        title={`Has payment of ${formatCurrency(item.amountPaid)}`}
                      >
                        <Lock className="h-4 w-4" />
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.localId)}
                        disabled={activeLineItems.length === 1 && !isEditMode}
                        className={`h-9 w-9 p-0 ${
                          activeLineItems.length > 1 || isEditMode
                            ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                            : "text-gray-300 cursor-not-allowed"
                        }`}
                        title="Remove fee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Deleted items (show as strikethrough with restore option) */}
                {deletedLineItems.map((item) => (
                  <div
                    key={item.localId}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-red-200 bg-red-50 p-3 opacity-60"
                  >
                    <div className="flex-1">
                      <span className="text-sm text-red-700 line-through">
                        {item.feeName} -{" "}
                        {formatCurrency(parseFloat(item.amount))}
                      </span>
                      <span className="ml-2 text-xs text-red-500">
                        (will be deleted)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreLineItem(item.localId)}
                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-100"
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Fee Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="w-full gap-1 border-dashed"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Fee Payment
              </Button>

              {/* Total */}
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Total Payment
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={isSubmitDisabled}
                >
                  {submitText}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
