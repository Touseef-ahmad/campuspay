"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Search } from "lucide-react";

interface Student {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  department: string | null;
  status: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    department: "",
    enrollmentDate: "",
    academicYear: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/students?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add student");
        return;
      }
      setOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        department: "",
        enrollmentDate: "",
        academicYear: "",
      });
      load(search);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, department: v }))
                  }
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Enrollment Date</Label>
                <Input
                  type="date"
                  value={form.enrollmentDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, enrollmentDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input
                  placeholder="e.g. 2024-2025"
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, academicYear: e.target.value }))
                  }
                />
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
                  {saving ? "Saving…" : "Add Student"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/students/${s.id}`)}
                  >
                    <TableCell className="font-mono text-xs">
                      {s.studentId ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.firstName} {s.lastName}
                    </TableCell>
                    <TableCell>{s.department ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "active" ? "success" : "secondary"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/students/${s.id}`);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
