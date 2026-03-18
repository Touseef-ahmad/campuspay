"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  PlusCircle,
  BookOpen,
  Pencil,
  Trash2,
  GraduationCap,
  Clock,
  Users,
  Award,
} from "lucide-react";

type CourseStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface Course {
  id: string;
  code: string;
  title: string;
  department: string | null;
  credits: number | null;
  maxStudents: number | null;
  semester: string | null;
  duration: string | null;
  status: CourseStatus;
  _count: { enrollments: number };
}

const emptyForm = {
  code: "",
  title: "",
  department: "",
  credits: "",
  maxStudents: "",
  semester: "",
  duration: "",
  status: "ACTIVE" as CourseStatus,
};

const statusVariant: Record<CourseStatus, "success" | "secondary" | "outline"> =
  {
    ACTIVE: "success",
    INACTIVE: "secondary",
    ARCHIVED: "outline",
  };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/courses");
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(c: Course) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      title: c.title,
      department: c.department ?? "",
      credits: c.credits?.toString() ?? "",
      maxStudents: c.maxStudents?.toString() ?? "",
      semester: c.semester ?? "",
      duration: c.duration ?? "",
      status: c.status,
    });
    setError("");
    setOpen(true);
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
      if (form.maxStudents) payload.maxStudents = Number(form.maxStudents);
      if (form.semester) payload.semester = form.semester;
      if (form.duration) payload.duration = form.duration;

      if (editingId) payload.id = editingId;

      const res = await fetch("/api/courses", {
        method: editingId ? "PUT" : "POST",
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
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this course?")) return;
    const res = await fetch(`/api/courses?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Course" : "Add New Course"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Row 1: Code + Title */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Course Code</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    required
                    placeholder="CS405"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    required
                    placeholder="Advanced Data Structures"
                  />
                </div>
              </div>
              {/* Row 2: Department */}
              <div className="space-y-2">
                <Label>Department / Category</Label>
                <Input
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  placeholder="Computer Science"
                />
              </div>
              {/* Row 3: Credits + Max Students */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.credits}
                    onChange={(e) => set("credits", e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Students</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxStudents}
                    onChange={(e) => set("maxStudents", e.target.value)}
                    placeholder="35"
                  />
                </div>
              </div>
              {/* Row 4: Semester + Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input
                    value={form.semester}
                    onChange={(e) => set("semester", e.target.value)}
                    placeholder="Fall 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                    placeholder="16 weeks"
                  />
                </div>
              </div>
              {/* Row 5: Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v)}
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
                    : editingId
                      ? "Update Course"
                      : "Add Course"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <BookOpen className="mb-4 h-10 w-10" />
          <p className="text-lg font-medium">No courses yet</p>
          <p className="text-sm">Add your first course to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col">
              {/* Header: Code badge + Status badge */}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <Badge variant="outline" className="font-mono text-xs">
                  {c.code}
                </Badge>
                <Badge variant={statusVariant[c.status]}>
                  {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                </Badge>
              </CardHeader>

              {/* Main Content: Title + Department */}
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold leading-tight">
                    {c.title}
                  </h3>
                  {c.department && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.department}
                    </p>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Award className="h-3.5 w-3.5" />
                    <span>Credits:</span>
                    <span className="font-medium text-foreground">
                      {c.credits ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Semester:</span>
                    <span className="font-medium text-foreground">
                      {c.semester ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>Max:</span>
                    <span className="font-medium text-foreground">
                      {c.maxStudents ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Duration:</span>
                    <span className="font-medium text-foreground">
                      {c.duration ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto flex justify-end gap-1 border-t pt-3">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                    <span className="text-destructive">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
