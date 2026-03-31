"use client";

import { useState } from "react";
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
import { Calendar } from "lucide-react";

const semesterTypes = ["Fall", "Spring", "Summer"] as const;

const emptySemesterForm = {
  type: "" as string,
  year: new Date().getFullYear().toString(),
  startDate: "",
  endDate: "",
};

interface CreateSemesterModalProps {
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

export function CreateSemesterModal({
  trigger,
  onCreated,
}: CreateSemesterModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptySemesterForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setForm(emptySemesterForm);
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.type || !form.year || !form.startDate || !form.endDate) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const name = `${form.type} ${form.year}`;
      const res = await fetch("/api/academic-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to create semester",
        );
        return;
      }
      setOpen(false);
      setForm(emptySemesterForm);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Create Semester
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Semester</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Semester Type */}
          <div className="space-y-2">
            <Label>
              Select Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.type}
              onValueChange={(v) => setField("type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Semester Type" />
              </SelectTrigger>
              <SelectContent>
                {semesterTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div className="space-y-2">
            <Label>
              Select Year <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={2020}
                max={2050}
                value={form.year}
                onChange={(e) => setField("year", e.target.value)}
                placeholder="2026"
              />
              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>
              End Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setField("endDate", e.target.value)}
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
              disabled={saving}
              className="bg-[#007BFF] hover:bg-blue-600"
            >
              {saving ? "Creating..." : "Create Semester"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
