"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2 } from "lucide-react";

interface ProgramImpact {
  enrolledStudents: number;
  programOfferings: number;
  studentFees: number;
}

interface DeleteProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: {
    id: string;
    title: string;
    code: string;
  } | null;
  onDeleted?: () => void;
}

export function DeleteProgramModal({
  open,
  onOpenChange,
  program,
  onDeleted,
}: DeleteProgramModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impact, setImpact] = useState<ProgramImpact | null>(null);
  const [error, setError] = useState("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setError("");
      if (program) {
        fetchImpact(program.id);
      }
    } else {
      setImpact(null);
    }
  }, [open, program]);

  async function fetchImpact(programId: string) {
    setLoadingImpact(true);
    try {
      const res = await fetch(`/api/programs?id=${programId}&impact=true`);
      if (res.ok) {
        const data = await res.json();
        setImpact(data);
      }
    } catch {
      // Silently fail - we'll still allow deletion
    } finally {
      setLoadingImpact(false);
    }
  }

  async function handleDelete() {
    if (!program || !confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/programs?id=${program.id}&soft=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete program");
        return;
      }

      onOpenChange(false);
      onDeleted?.();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  }

  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-4">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
          </div>

          {/* Title with program name highlighted */}
          <DialogTitle className="text-center text-xl">
            Delete <span className="text-red-600">{program.title}</span>?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Danger Zone Warning Box */}
          <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              This will archive the program and all associated data:
            </p>

            {/* Impact Quantification */}
            {loadingImpact ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating impact...
              </div>
            ) : impact ? (
              <ul className="mt-3 space-y-1.5 text-sm text-red-700">
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-semibold">
                    {impact.enrolledStudents}
                  </span>{" "}
                  enrolled students
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-semibold">
                    {impact.programOfferings}
                  </span>{" "}
                  semester offerings
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-semibold">{impact.studentFees}</span>{" "}
                  fee records
                </li>
              </ul>
            ) : (
              <p className="mt-2 text-sm text-red-700">
                All associated data will be archived.
              </p>
            )}
          </div>

          {/* Irreversibility Notice */}
          <p className="text-center text-sm text-gray-500">
            The program will be marked as{" "}
            <span className="font-medium">Archived</span> and hidden from active
            views.
          </p>

          {/* Checkbox Confirmation */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              I understand that this will archive{" "}
              <span className="font-semibold">
                {program.code} - {program.title}
              </span>{" "}
              and all associated data.
            </span>
          </label>

          {/* Error Message */}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300"
              onClick={handleDelete}
              disabled={!confirmed || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Program"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
