"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface AddClassModalProps {
  programId: string;
  programCode: string;
  totalSemesters?: number | null;
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

const emptyForm = {
  termId: "",
  semesterNumber: "",
  maxStudents: "",
};

export function AddClassModal({
  programId,
  programCode,
  totalSemesters,
  trigger,
  onCreated,
}: AddClassModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);

  // Load academic terms when modal opens
  useEffect(() => {
    if (open) {
      setLoadingTerms(true);
      fetch("/api/academic-terms")
        .then((res) => res.json())
        .then((data) => {
          setAcademicTerms(Array.isArray(data) ? data : []);
        })
        .finally(() => setLoadingTerms(false));
    }
  }, [open]);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setForm(emptyForm);
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.termId || !form.semesterNumber) {
      setError("Academic term and semester number are required");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        programId,
        termId: form.termId,
        semesterNumber: Number(form.semesterNumber),
      };
      if (form.maxStudents) {
        payload.maxStudents = Number(form.maxStudents);
      }

      const res = await fetch("/api/program-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Failed to add class",
        );
        return;
      }
      setOpen(false);
      setForm(emptyForm);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  // Generate semester number options based on totalSemesters or default to 8
  const maxSemesters = totalSemesters || 8;
  const semesterOptions = Array.from({ length: maxSemesters }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="default"
            size="sm"
            className="bg-[#007BFF] hover:bg-blue-600 text-white text-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Class
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Class to {programCode}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Academic Term */}
          <div className="space-y-2">
            <Label>
              Academic Term <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.termId}
              onValueChange={(v) => setField("termId", v)}
              disabled={loadingTerms}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingTerms ? "Loading..." : "Select Term"}
                />
              </SelectTrigger>
              <SelectContent>
                {academicTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {academicTerms.length === 0 && !loadingTerms && (
              <p className="text-xs text-muted-foreground">
                No academic terms found. Create a semester first.
              </p>
            )}
          </div>

          {/* Semester Number */}
          <div className="space-y-2">
            <Label>
              Semester Number <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.semesterNumber}
              onValueChange={(v) => setField("semesterNumber", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                {semesterOptions.map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    Semester {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Students (optional) */}
          <div className="space-y-2">
            <Label>Max Students (optional)</Label>
            <Input
              type="number"
              min={1}
              value={form.maxStudents}
              onChange={(e) => setField("maxStudents", e.target.value)}
              placeholder="e.g., 50"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || academicTerms.length === 0}
              className="bg-[#007BFF] hover:bg-blue-600"
            >
              {saving ? "Adding..." : "Add Class"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
