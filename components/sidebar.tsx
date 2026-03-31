"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Wallet,
  LogOut,
  GraduationCap,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Regular user nav items (school admins, staff)
const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/programs", label: "Programs", icon: BookOpen },
  { href: "/accounts", label: "Accounts", icon: Wallet },
];

// System admin nav items
const adminNavItems = [
  { href: "/users", label: "Users", icon: ShieldCheck },
  { href: "/institutes", label: "Institutes", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is system admin from cookie/session
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setIsSystemAdmin(data.isSystemAdmin ?? false);
        }
      } catch {
        setIsSystemAdmin(false);
      }
    }
    checkAuth();
  }, []);

  const navItems = isSystemAdmin ? adminNavItems : userNavItems;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-full w-27.5 flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-white/10">
        <GraduationCap className="h-6 w-6 text-white" />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md px-1 py-2.5 transition-colors",
                active ? "text-white" : "text-white/70 hover:text-white",
              )}
            >
              {/* Icon container: white 34×34 bg when active */}
              <span
                className={cn(
                  "flex h-8.5 w-8.5 items-center justify-center rounded-[5px] transition-colors",
                  active ? "bg-white" : "hover:bg-white/10",
                )}
              >
                <Icon
                  className="h-6 w-6"
                  style={
                    active
                      ? {
                          color: "hsl(var(--primary))",
                          fill: "hsl(var(--primary))",
                        }
                      : undefined
                  }
                />
              </span>
              <span
                className="text-center leading-tight"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-2">
        <button
          className="flex w-full flex-col items-center gap-1.5 rounded-md px-1 py-2.5 text-white/70 transition-colors hover:text-white"
          onClick={handleLogout}
        >
          <span className="flex h-8.5 w-8.5 items-center justify-center rounded-[5px] hover:bg-white/10">
            <LogOut className="h-6 w-6" />
          </span>
          <span
            className="text-center leading-tight"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
              fontSize: "14px",
            }}
          >
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
