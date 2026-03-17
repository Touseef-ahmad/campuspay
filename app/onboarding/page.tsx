"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Mode = "institute" | "staff";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("institute");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    instituteName: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: "",
    instituteId: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const body =
        mode === "institute"
          ? {
              type: "institute",
              instituteName: form.instituteName,
              address: form.address,
              email: form.email,
              password: form.password,
            }
          : {
              type: "staff",
              email: form.email,
              password: form.password,
              instituteId: form.instituteId,
            };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      router.push("/pending-approval");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Get Started</CardTitle>
          <CardDescription>
            Register a new school or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={mode === "institute" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("institute")}
            >
              New School
            </Button>
            <Button
              type="button"
              variant={mode === "staff" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("staff")}
            >
              Join as Staff
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "institute" && (
              <>
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input
                    placeholder="Greenwood Academy"
                    value={form.instituteName}
                    onChange={(e) => update("instituteName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address (optional)</Label>
                  <Input
                    placeholder="123 Main St, City"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                  />
                </div>
              </>
            )}

            {mode === "staff" && (
              <div className="space-y-2">
                <Label>Institute ID</Label>
                <Input
                  placeholder="Paste your school's Institute ID"
                  value={form.instituteId}
                  onChange={(e) => update("instituteId", e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="you@school.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Creating account…"
                : mode === "institute"
                  ? "Create School"
                  : "Request Access"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-primary underline underline-offset-4"
            >
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
