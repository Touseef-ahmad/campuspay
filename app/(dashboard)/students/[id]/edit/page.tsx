"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, BookOpen, Settings, Ban, ChevronRight } from "lucide-react";

interface StudentDetail {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  department: string | null;
  enrollmentDate: string | null;
  academicYear: string | null;
  status: string;
}

export default function StudentEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [error, setError] = useState("");

  // Fields that exist in the schema and are persisted to the API
  const [academicForm, setAcademicForm] = useState({
    department: "",
    academicYear: "",
    enrollmentDate: "",
  });

  // TODO: Extend the Student model in prisma/schema.prisma with these personal info fields,
  // then add them to the updateSchema in /app/api/students/[id]/route.ts and include
  // them in the PUT call below.
  const [personalForm, setPersonalForm] = useState({
    dateOfBirth: "",
    gender: "",
    address: "",
    phoneNumber: "",
    emergencyContactName: "",
    relationship: "",
    emergencyContactNumber: "",
  });

  // TODO: Extend the Student model and API with programLevel, expectedGraduation,
  // academicAdvisor, and cgpa fields.
  const [extendedAcademic, setExtendedAcademic] = useState({
    programLevel: "",
    expectedGraduation: "",
    academicAdvisor: "",
    cgpa: "",
  });

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/students/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const s: StudentDetail = await res.json();
      setAcademicForm({
        department: s.department ?? "",
        academicYear: s.academicYear ?? "",
        enrollmentDate: s.enrollmentDate
          ? new Date(s.enrollmentDate).toISOString().split("T")[0]
          : "",
      });
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // TODO: Merge personalForm and extendedAcademic into the body once those
        // fields have been added to the schema and API update handler.
        body: JSON.stringify(academicForm),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }
      router.push(`/students/${id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend() {
    setSuspending(true);
    try {
      await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      });
      router.push(`/students/${id}`);
    } finally {
      setSuspending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Link href="/dashboard" className="hover:text-gray-600">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/students" className="hover:text-gray-600">
              Students
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-500">Edit Profile</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Student Profile
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/students/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 2. Three-column card layout */}
      <div className="grid grid-cols-3 gap-4 items-start">
        {/* Column 1: Personal Information */}
        <Card className="border bg-white">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-900">
              Personal Information
            </span>
          </div>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save dateOfBirth once schema field is added */}
              <Input
                type="date"
                value={personalForm.dateOfBirth}
                onChange={(e) =>
                  setPersonalForm((p) => ({
                    ...p,
                    dateOfBirth: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Gender <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save gender once schema field is added */}
              <Select
                value={personalForm.gender}
                onValueChange={(v) =>
                  setPersonalForm((p) => ({ ...p, gender: v }))
                }
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Full Address <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save address once schema field is added */}
              <Input
                value={personalForm.address}
                onChange={(e) =>
                  setPersonalForm((p) => ({ ...p, address: e.target.value }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save phoneNumber once schema field is added */}
              <Input
                type="tel"
                value={personalForm.phoneNumber}
                onChange={(e) =>
                  setPersonalForm((p) => ({
                    ...p,
                    phoneNumber: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Emergency Contact Name <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save emergencyContactName once schema field is added */}
              <Input
                value={personalForm.emergencyContactName}
                onChange={(e) =>
                  setPersonalForm((p) => ({
                    ...p,
                    emergencyContactName: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">Relationship</Label>
              {/* TODO: Save relationship once schema field is added */}
              <Input
                value={personalForm.relationship}
                onChange={(e) =>
                  setPersonalForm((p) => ({
                    ...p,
                    relationship: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Emergency Contact Number <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save emergencyContactNumber once schema field is added */}
              <Input
                type="tel"
                value={personalForm.emergencyContactNumber}
                onChange={(e) =>
                  setPersonalForm((p) => ({
                    ...p,
                    emergencyContactNumber: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Academic Information */}
        <Card className="border bg-white">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-900">
              Academic Information
            </span>
          </div>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={academicForm.department}
                onValueChange={(v) =>
                  setAcademicForm((p) => ({ ...p, department: v }))
                }
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Computer Science",
                    "Engineering",
                    "Business",
                    "Arts",
                    "Science",
                    "Mathematics",
                    "Law",
                    "Medicine",
                  ].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Program Level <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save programLevel once schema field is added */}
              <Select
                value={extendedAcademic.programLevel}
                onValueChange={(v) =>
                  setExtendedAcademic((p) => ({ ...p, programLevel: v }))
                }
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="postgraduate">Postgraduate</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                  <SelectItem value="diploma">Diploma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Academic Year <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 2024-2025"
                value={academicForm.academicYear}
                onChange={(e) =>
                  setAcademicForm((p) => ({
                    ...p,
                    academicYear: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Enrollment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={academicForm.enrollmentDate}
                onChange={(e) =>
                  setAcademicForm((p) => ({
                    ...p,
                    enrollmentDate: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Expected Graduation
              </Label>
              {/* TODO: Save expectedGraduation once schema field is added */}
              <Input
                type="date"
                value={extendedAcademic.expectedGraduation}
                onChange={(e) =>
                  setExtendedAcademic((p) => ({
                    ...p,
                    expectedGraduation: e.target.value,
                  }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Academic Advisor <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Populate from a /api/users or /api/advisors endpoint and save
                  academicAdvisor once schema field is added */}
              <Select
                value={extendedAcademic.academicAdvisor}
                onValueChange={(v) =>
                  setExtendedAcademic((p) => ({ ...p, academicAdvisor: v }))
                }
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Select advisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                Current CGPA / Grade <span className="text-red-500">*</span>
              </Label>
              {/* TODO: Save cgpa once schema field is added */}
              <Input
                placeholder="e.g. 3.75"
                value={extendedAcademic.cgpa}
                onChange={(e) =>
                  setExtendedAcademic((p) => ({ ...p, cgpa: e.target.value }))
                }
                className="border-gray-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Account Settings */}
        <Card className="border bg-white">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-900">
              Account Settings
            </span>
          </div>
          <CardContent className="pt-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-700" />
                <span className="font-semibold text-red-700">
                  Account Status
                </span>
              </div>
              <p className="mt-1 text-sm text-red-700">
                Suspend or deactivate student account.
              </p>
              <Button
                type="button"
                disabled={suspending}
                onClick={handleSuspend}
                className="mt-4 bg-red-600 text-white hover:bg-red-700"
              >
                <Ban className="mr-2 h-4 w-4 text-white" />
                {suspending ? "Suspending…" : "Suspend Account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
