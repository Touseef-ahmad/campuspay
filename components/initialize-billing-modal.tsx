"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Receipt,
  Loader2,
  Calendar,
  ChevronDown,
  CheckCircle,
} from "lucide-react";

interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Program {
  id: string;
  code: string;
  title: string;
}

interface ProgramOffering {
  id: string;
  semesterNumber: number;
  programId: string;
  program: Program;
  term: AcademicTerm;
  _count?: { enrollments: number };
}

interface Student {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
}

interface Enrollment {
  id: string;
  student: Student;
  programOfferingId: string;
}

interface InitializeBillingModalProps {
  trigger?: React.ReactNode;
  onInitialized?: () => void;
}

export function InitializeBillingModal({
  trigger,
  onInitialized,
}: InitializeBillingModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState<{
    feesCreated: number;
    studentsProcessed: number;
    sourceTerm: string;
    targetTerm: string;
  } | null>(null);

  // Data
  const [programOfferings, setProgramOfferings] = useState<ProgramOffering[]>(
    [],
  );
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  // Form state
  const [sourceOfferingId, setSourceOfferingId] = useState("");
  const [targetOfferingId, setTargetOfferingId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );

  // Fetch program offerings when modal opens
  useEffect(() => {
    if (open) {
      setError("");
      setSourceOfferingId("");
      setTargetOfferingId("");
      setSelectedStudentIds(new Set());
      setEnrollments([]);
      setSuccessResult(null);
      fetchProgramOfferings();
    }
  }, [open]);

  // Fetch students enrolled in source offering when source changes
  useEffect(() => {
    if (sourceOfferingId) {
      fetchEnrollments(sourceOfferingId);
      setSelectedStudentIds(new Set());
    } else {
      setEnrollments([]);
    }
  }, [sourceOfferingId]);

  async function fetchProgramOfferings() {
    setLoading(true);
    try {
      const res = await fetch("/api/program-offerings");
      if (res.ok) {
        const data = await res.json();
        setProgramOfferings(data);
      }
    } catch {
      setError("Failed to load program offerings");
    } finally {
      setLoading(false);
    }
  }

  async function fetchEnrollments(offeringId: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/billing/initialize?sourceOfferingId=${offeringId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments || []);
      }
    } catch {
      setError("Failed to load enrolled students");
    } finally {
      setLoading(false);
    }
  }

  // Filter target offerings to show only valid targets for the selected source
  const targetOfferings = useMemo(() => {
    if (!sourceOfferingId) return [];

    const source = programOfferings.find((o) => o.id === sourceOfferingId);
    if (!source) return [];

    // Show offerings from the same program but different term or next semester
    return programOfferings.filter(
      (o) =>
        o.id !== sourceOfferingId &&
        o.programId === source.programId &&
        (o.semesterNumber > source.semesterNumber ||
          o.term.startDate > source.term.startDate),
    );
  }, [sourceOfferingId, programOfferings]);

  // Source offerings are those with enrollments
  const sourceOfferings = useMemo(() => {
    return programOfferings.filter((o) => (o._count?.enrollments || 0) > 0);
  }, [programOfferings]);

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedStudentIds(new Set(enrollments.map((e) => e.student.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  }

  function toggleStudent(studentId: string) {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudentIds(newSet);
  }

  async function handleInitialize() {
    if (!sourceOfferingId || !targetOfferingId || selectedStudentIds.size === 0)
      return;

    setInitializing(true);
    setError("");

    try {
      const res = await fetch("/api/billing/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceOfferingId,
          targetOfferingId,
          studentIds: Array.from(selectedStudentIds),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to initialize billing");
        return;
      }

      // Show success state
      setSuccessResult({
        feesCreated: data.feesCreated || 0,
        studentsProcessed: data.studentsProcessed || 0,
        sourceTerm: sourceOffering?.term.name || "",
        targetTerm: targetOffering?.term.name || "",
      });
      onInitialized?.();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setInitializing(false);
    }
  }

  const isAllSelected =
    enrollments.length > 0 && selectedStudentIds.size === enrollments.length;

  const sourceOffering = programOfferings.find(
    (o) => o.id === sourceOfferingId,
  );
  const targetOffering = programOfferings.find(
    (o) => o.id === targetOfferingId,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Initialize Billing
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        {/* Success State */}
        {successResult ? (
          <div className="flex flex-col items-center py-6 text-center">
            {/* Success Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            {/* Title */}
            <h2 className="mt-4 text-xl font-semibold text-green-600">
              Billing Initialized
            </h2>

            {/* Summary */}
            <p className="mt-3 text-sm text-gray-600">
              Successfully moved students from{" "}
              <span className="font-semibold text-gray-900">
                {successResult.sourceTerm}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-900">
                {successResult.targetTerm}
              </span>
            </p>

            {/* Stats */}
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {successResult.feesCreated}
                </p>
                <p className="text-xs text-gray-500">new fees</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {successResult.studentsProcessed}
                </p>
                <p className="text-xs text-gray-500">students</p>
              </div>
            </div>

            {/* OK Button */}
            <Button
              className="mt-6 w-32 bg-blue-600 hover:bg-blue-700"
              onClick={() => setOpen(false)}
            >
              Ok
            </Button>
          </div>
        ) : (
          /* Form State */
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Initialize Billing</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Migrate students to a new semester and generate fee records.
              </p>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Source Semester */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Source Semester <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={sourceOfferingId}
                  onValueChange={setSourceOfferingId}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Select source semester" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOfferings.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-gray-500">
                        No semesters with enrolled students
                      </div>
                    ) : (
                      sourceOfferings.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.program.code} - {o.term.name} (Sem{" "}
                          {o.semesterNumber}) • {o._count?.enrollments || 0}{" "}
                          students
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Semester */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Target Semester <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={targetOfferingId}
                  onValueChange={setTargetOfferingId}
                  disabled={!sourceOfferingId || loading}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Select target semester" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {targetOfferings.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-gray-500">
                        {sourceOfferingId
                          ? "No available target semesters"
                          : "Select a source semester first"}
                      </div>
                    ) : (
                      targetOfferings.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.program.code} - {o.term.name} (Sem{" "}
                          {o.semesterNumber})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Student Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Select Students <span className="text-red-500">*</span>
                </Label>

                <div className="rounded-lg border border-gray-200 bg-white">
                  {/* Select All Header */}
                  <label className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      disabled={enrollments.length === 0}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All
                    </span>
                    {enrollments.length > 0 && (
                      <span className="ml-auto text-xs text-gray-400">
                        {selectedStudentIds.size} of {enrollments.length}{" "}
                        selected
                      </span>
                    )}
                  </label>

                  {/* Student List */}
                  <div className="max-h-48 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : enrollments.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">
                        {sourceOfferingId
                          ? "No students enrolled in this semester"
                          : "Select a source semester to view students"}
                      </div>
                    ) : (
                      enrollments.map((enrollment) => (
                        <label
                          key={enrollment.id}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(
                              enrollment.student.id,
                            )}
                            onChange={() =>
                              toggleStudent(enrollment.student.id)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-700">
                              {enrollment.student.firstName}{" "}
                              {enrollment.student.lastName}
                            </span>
                            {enrollment.student.studentId && (
                              <span className="text-xs text-gray-400">
                                {enrollment.student.studentId}
                              </span>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Migration Summary */}
              {sourceOffering &&
                targetOffering &&
                selectedStudentIds.size > 0 && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">
                        {selectedStudentIds.size} students
                      </span>{" "}
                      will be enrolled in{" "}
                      <span className="font-semibold">
                        {targetOffering.program.code} -{" "}
                        {targetOffering.term.name} (Semester{" "}
                        {targetOffering.semesterNumber})
                      </span>{" "}
                      and fee records will be generated.
                    </p>
                  </div>
                )}

              {/* Error Message */}
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                  disabled={initializing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleInitialize}
                  disabled={
                    !sourceOfferingId ||
                    !targetOfferingId ||
                    selectedStudentIds.size === 0 ||
                    initializing
                  }
                >
                  {initializing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    "Initialize Billing"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
