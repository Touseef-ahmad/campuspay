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

type ProgramStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface Program {
  id: string;
  code: string;
  title: string;
  department: string | null;
  credits: number | null;
  totalSemesters: number | null;
  duration: string | null;
  status: ProgramStatus;
}

const emptyForm = {
  code: "",
  title: "",
  department: "",
  credits: "",
  totalSemesters: "",
  duration: "",
  status: "ACTIVE" as ProgramStatus,
};

interface ProgramModalProps {
  program?: Program | null;
  trigger?: React.ReactNode;
  onSaved?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProgramModal({
  program,
  trigger,
  onSaved,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ProgramModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const isEditing = !!program;

  useEffect(() => {
    if (open && program) {
      setForm({
        code: program.code,
        title: program.title,
        department: program.department ?? "",
        credits: program.credits?.toString() ?? "",
        totalSemesters: program.totalSemesters?.toString() ?? "",
        duration: program.duration ?? "",
        status: program.status,
      });
    } else if (open && !program) {
      setForm(emptyForm);
    }
    if (open) {
      setError("");
    }
  }, [open, program]);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code,
        title: form.title,
        status: form.status,
      };
      if (form.department) payload.department = form.department;
      if (form.credits) payload.credits = Number(form.credits);
      if (form.totalSemesters)
        payload.totalSemesters = Number(form.totalSemesters);
      if (form.duration) payload.duration = form.duration;
      if (program?.id) payload.id = program.id;

      const res = await fetch("/api/programs", {
        method: program?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      setOpen(false);
      setForm(emptyForm);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Program" : "Add New Program"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Code + Title */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Program Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                required
                placeholder="CS405"
              />
            </div>
            <div className="space-y-2">
              <Label>Program Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
                placeholder="Computer Science"
              />
            </div>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={form.department}
              onChange={(e) => setField("department", e.target.value)}
              placeholder="Department of Computer Science"
            />
          </div>

          {/* Credits + Total Semesters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Credits</Label>
              <Input
                type="number"
                min={1}
                value={form.credits}
                onChange={(e) => setField("credits", e.target.value)}
                placeholder="140"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Semesters</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={form.totalSemesters}
                onChange={(e) => setField("totalSemesters", e.target.value)}
                placeholder="8"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <Input
              value={form.duration}
              onChange={(e) => setField("duration", e.target.value)}
              placeholder="4 years"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setField("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
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
              {saving
                ? "Saving…"
                : isEditing
                  ? "Update Program"
                  : "Add Program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Convenience wrapper for Add button
export function AddProgramButton({ onSaved }: { onSaved?: () => void }) {
  return (
    <ProgramModal
      trigger={
        <Button className="bg-[#007BFF] hover:bg-blue-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add New Program
        </Button>
      }
      onSaved={onSaved}
    />
  );
}
