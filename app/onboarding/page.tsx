"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff } from "lucide-react";

type Mode = "institute" | "staff";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("institute");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1986&auto=format&fit=crop')`,
          }}
        />
        {/* Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <GraduationCap className="w-20 h-20 mb-6 opacity-90" />
          <h1 className="text-4xl md:text-5xl font-bold text-center leading-tight">
            Welcome to
            <br />
            <span className="text-white/95">UNIVERSITY Portal</span>
          </h1>
          <p className="mt-4 text-lg text-white/80 text-center max-w-md">
            Manage your institution&apos;s finances with ease and transparency
          </p>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Header with Icon */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Get Started</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Register a new school or join an existing one
          </p>

          {/* Segmented Control / Tabs */}
          <div className="flex bg-muted rounded-lg p-1 mb-8">
            <button
              type="button"
              className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all ${
                mode === "institute"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("institute")}
            >
              New School
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all ${
                mode === "staff"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("staff")}
            >
              Join as Staff
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "institute" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    School Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Greenwood Academy"
                    value={form.instituteName}
                    onChange={(e) => update("instituteName", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Address <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    placeholder="123 Main St, City"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    className="h-11"
                  />
                </div>
              </>
            )}

            {mode === "staff" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Institute ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Paste your school's Institute ID"
                  value={form.instituteId}
                  onChange={(e) => update("instituteId", e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="you@school.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  minLength={8}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Request Access"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
