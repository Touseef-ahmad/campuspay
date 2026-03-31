"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  AlertTriangle,
  Wallet,
  CreditCard,
  Plus,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddStudentPaymentModal } from "@/components/add-student-payment-modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardStats {
  monthlyRevenue: number;
  revenueChange: number;
  pendingDues: number;
  totalCollected: number;
  totalExpenses: number;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  date: string;
  description: string;
  account: string;
  method?: string;
  category?: string;
}

// ---------------------------------------------------------------------------
// Category filter options
// ---------------------------------------------------------------------------
const CATEGORIES = ["All", "Fee Collection", "Expense"];

export default function DashboardPage() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter] = useState("18-Mar-2026");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    revenueChange: 0,
    pendingDues: 0,
    totalCollected: 0,
    totalExpenses: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardRes, transactionsRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/transactions"),
        ]);

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setStats({
            monthlyRevenue: data.monthlyRevenue ?? 0,
            revenueChange: data.revenueChange ?? 0,
            pendingDues: data.pendingDues ?? 0,
            totalCollected: data.totalCollected ?? 0,
            totalExpenses: data.totalExpenses ?? 0,
          });
        }

        if (transactionsRes.ok) {
          const data = await transactionsRes.json();
          setTransactions(Array.isArray(data) ? data : []);
        }
      } catch {
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Format currency helper
  function formatCurrency(amount: number) {
    if (amount >= 1000000) {
      return `RS ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `RS ${(amount / 1000).toFixed(1)}K`;
    }
    return `RS ${amount.toLocaleString()}`;
  }

  // Format date helper
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // KPI cards data (now dynamic)
  const KPI_CARDS = [
    {
      label: "Total Monthly Revenue",
      value: formatCurrency(stats.monthlyRevenue),
      trend: stats.revenueChange >= 0 ? "up" : "down",
      trendText: `${Math.abs(stats.revenueChange)}% from last month`,
      icon: LineChart,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: "Total Due Fees",
      value: formatCurrency(stats.pendingDues),
      trend: "down",
      trendText: "pending collection",
      icon: AlertTriangle,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      label: "Total Amount Credited",
      value: formatCurrency(stats.totalCollected),
      trend: "up",
      trendText: "Total collected",
      icon: Wallet,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      label: "Total Amount Debited",
      value: formatCurrency(stats.totalExpenses),
      trend: "up",
      trendText: "Total expenses",
      icon: CreditCard,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
    },
  ];

  // Transform transactions to ledger rows
  const ledgerRows = useMemo(() => {
    return transactions.map((t) => ({
      id: t.id,
      date: formatDate(t.date),
      category: t.type === "credit" ? "Fee Collection" : "Expense",
      description: t.description,
      credit: t.type === "debit" ? t.amount : null,
      debit: t.type === "credit" ? t.amount : null,
    }));
  }, [transactions]);

  // Filter rows by category
  const filteredRows = useMemo(() => {
    if (categoryFilter === "All") return ledgerRows;
    return ledgerRows.filter((r) => r.category === categoryFilter);
  }, [ledgerRows, categoryFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const credit = filteredRows.reduce((sum, r) => sum + (r.credit || 0), 0);
    const debit = filteredRows.reduce((sum, r) => sum + (r.debit || 0), 0);
    return { credit, debit, total: credit + debit };
  }, [filteredRows]);

  return (
    <div className="min-h-screen space-y-6 bg-[#F8F9FA]">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Page Header                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your institution&apos;s financial health and student
            enrollment
          </p>
        </div>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setPaymentModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </Button>
        <AddStudentPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onSuccess={() => {
            // Refresh dashboard data after payment
            fetch("/api/dashboard")
              .then((res) => res.json())
              .then((data) => {
                setStats({
                  monthlyRevenue: data.monthlyRevenue ?? 0,
                  revenueChange: data.revenueChange ?? 0,
                  pendingDues: data.pendingDues ?? 0,
                  totalCollected: data.totalCollected ?? 0,
                  totalExpenses: data.totalExpenses ?? 0,
                });
              });
            fetch("/api/transactions")
              .then((res) => res.json())
              .then((data) => {
                setTransactions(Array.isArray(data) ? data : []);
              });
          }}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. KPI Summary Cards                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          const isUp = card.trend === "up";
          return (
            <div
              key={card.label}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">{card.label}</span>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded ${card.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </span>
              </div>
              <div className="mb-2 text-2xl font-bold text-gray-900">
                {loading ? "..." : card.value}
              </div>
              <p
                className={`text-xs font-medium ${isUp ? "text-green-600" : "text-red-500"}`}
              >
                {isUp ? "↑" : "↓"} {card.trendText}
              </p>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Filters Bar                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 bg-white px-5 py-4">
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Category</span>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Date</span>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={dateFilter}
              className="w-36 rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Financial Ledger Table                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Financial Ledger</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Date", "Category", "Description", "Credit", "Debit"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-3 text-gray-800">{row.date}</td>
                    <td className="px-6 py-3 text-gray-800">{row.category}</td>
                    <td className="px-6 py-3 text-gray-800">
                      {row.description}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {row.credit ? (
                        <span className="text-red-500">
                          {formatCurrency(row.credit)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {row.debit ? (
                        <span className="text-green-600">
                          {formatCurrency(row.debit)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Summary footer */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td
                  colSpan={3}
                  className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500"
                >
                  Total Amount
                </td>
                <td className="px-6 py-3 text-sm font-bold text-red-500">
                  CREDIT: {formatCurrency(totals.credit)}
                </td>
                <td className="px-6 py-3 text-sm font-bold text-green-600">
                  DEBIT: {formatCurrency(totals.debit)}
                  <span className="ml-6 text-blue-600">
                    TOTAL: {formatCurrency(totals.total)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
