"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  AlertTriangle,
  Wallet,
  CreditCard,
  Plus,
  Calendar,
  ChevronDown,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddStudentPaymentModal } from "@/components/add-student-payment-modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardStats {
  instituteName: string;
  monthlyRevenue: number;
  revenueChange: number;
  pendingDues: number;
  totalCollected: number;
  totalExpenses: number;
}

interface Transaction {
  id: string;
  type: "credit" | "debit" | "deposit";
  amount: number;
  date: string;
  description: string;
  account: string;
  method?: string;
  category?: string;
  receiptNumber?: string;
  studentId?: string;
  studentName?: string;
}

// ---------------------------------------------------------------------------
// Category filter options
// ---------------------------------------------------------------------------
const CATEGORIES = ["All", "Fee Collection", "Expense", "Deposit"];

export default function DashboardPage() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    instituteName: "",
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
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        const qs = params.toString() ? `?${params}` : "";

        const [dashboardRes, transactionsRes] = await Promise.all([
          fetch(`/api/dashboard${qs}`),
          fetch(`/api/transactions${qs}`),
        ]);

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setStats({
            instituteName: data.instituteName ?? "",
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
  }, [dateFrom, dateTo]);

  // Export / print report
  const instituteName = stats.instituteName;

  function handleExport() {
    // Collect unique income columns (fee collection + deposit categories)
    const hasFeeIncome = transactions.some((t) => t.type === "credit");
    const depositCols = [
      ...new Set(
        transactions
          .filter((t) => t.type === "deposit")
          .map((t) => t.category || "Deposit"),
      ),
    ].sort();
    const incomeCols = [
      ...(hasFeeIncome ? ["Fee Collection"] : []),
      ...depositCols,
    ];

    // Unique expense categories
    const expenseCols = [
      ...new Set(
        transactions
          .filter((t) => t.type === "debit")
          .map((t) => t.category || "General"),
      ),
    ].sort();

    // Group by date
    const dateMap = new Map<
      string,
      { income: Record<string, number>; expenses: Record<string, number> }
    >();
    transactions.forEach((t) => {
      const key = new Date(t.date).toISOString().split("T")[0];
      if (!dateMap.has(key)) dateMap.set(key, { income: {}, expenses: {} });
      const entry = dateMap.get(key)!;
      if (t.type === "credit") {
        entry.income["Fee Collection"] =
          (entry.income["Fee Collection"] || 0) + t.amount;
      } else if (t.type === "deposit") {
        const col = t.category || "Deposit";
        entry.income[col] = (entry.income[col] || 0) + t.amount;
      } else {
        const col = t.category || "General";
        entry.expenses[col] = (entry.expenses[col] || 0) + t.amount;
      }
    });

    const sortedDates = [...dateMap.keys()].sort();

    // Column totals
    const incomeTotals: Record<string, number> = {};
    const expenseTotals: Record<string, number> = {};
    sortedDates.forEach((d) => {
      const e = dateMap.get(d)!;
      incomeCols.forEach(
        (c) => (incomeTotals[c] = (incomeTotals[c] || 0) + (e.income[c] || 0)),
      );
      expenseCols.forEach(
        (c) =>
          (expenseTotals[c] = (expenseTotals[c] || 0) + (e.expenses[c] || 0)),
      );
    });

    const fmt = (n: number) => (n ? `RS ${n.toLocaleString("en-PK")}` : "");

    const fmtDate = (iso: string) =>
      new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const fromLabel = dateFrom ? fmtDate(dateFrom) : "—";
    const toLabel = dateTo ? fmtDate(dateTo) : "—";

    const incomeHeaderCells = incomeCols
      .map(
        (c) =>
          `<th class="cat-header income-cat"><div class="rotated">${c}</div></th>`,
      )
      .join("");
    const expenseHeaderCells = expenseCols
      .map(
        (c) =>
          `<th class="cat-header expense-cat"><div class="rotated">${c}</div></th>`,
      )
      .join("");

    const dataRows = sortedDates
      .map((d) => {
        const e = dateMap.get(d)!;
        const totalIncome = incomeCols.reduce(
          (s, c) => s + (e.income[c] || 0),
          0,
        );
        const totalExpense = expenseCols.reduce(
          (s, c) => s + (e.expenses[c] || 0),
          0,
        );
        const incomeCells = incomeCols
          .map((c) => `<td>${fmt(e.income[c] || 0)}</td>`)
          .join("");
        const expenseCells = expenseCols
          .map((c) => `<td>${fmt(e.expenses[c] || 0)}</td>`)
          .join("");
        return `<tr>
          <td class="date-cell">${fmtDate(d)}</td>
          ${incomeCells}
          <td class="subtotal income-cat">${fmt(totalIncome)}</td>
          ${expenseCells}
          <td class="subtotal expense-cat">${fmt(totalExpense)}</td>
        </tr>`;
      })
      .join("");

    const grandTotalIncome = incomeCols.reduce(
      (s, c) => s + (incomeTotals[c] || 0),
      0,
    );
    const grandTotalExpenses = expenseCols.reduce(
      (s, c) => s + (expenseTotals[c] || 0),
      0,
    );
    const incomeTotalCells = incomeCols
      .map((c) => `<td>${fmt(incomeTotals[c] || 0)}</td>`)
      .join("");
    const expenseTotalCells = expenseCols
      .map((c) => `<td>${fmt(expenseTotals[c] || 0)}</td>`)
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Financial Ledger</title>
  <style>
    @media print { @page { size: A3 landscape; margin: 10mm; } }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 8.5px; color: #000; margin: 0; padding: 12px; }
    .doc-title { text-align: center; font-size: 15px; font-weight: bold; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 1px; }
    .doc-subtitle { text-align: center; font-size: 11px; font-weight: bold; margin: 0 0 2px; text-transform: uppercase; }
    .doc-period { text-align: center; font-size: 9px; font-weight: normal; color: #444; margin: 0 0 10px; }
    table { border-collapse: collapse; width: 100%; table-layout: auto; }
    th, td { border: 1px solid #000; padding: 2px 4px; text-align: right; white-space: nowrap; }
    tbody tr td { padding: 2px 4px; line-height: 1.3; }
    .date-cell { text-align: left; font-weight: bold; min-width: 80px; }
    .cat-header { padding: 3px 2px; vertical-align: bottom; }
    .rotated { writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; height: auto; white-space: nowrap; font-size: 7.5px; }
    .group-header { font-weight: bold; font-size: 10px; text-align: center; }
    .income-cat { background-color: #e8f5e9; }
    .expense-cat { background-color: #fce4ec; }
    .subtotal { font-weight: bold; background-color: #f5f5f5; }
    .total-row td { font-weight: bold; background-color: #eeeeee; }
    .label-col { text-align: left; font-weight: bold; }
  </style>
</head>
<body>
  <div class="doc-title">${instituteName || "Financial Institution"}</div>
  <div class="doc-subtitle">Daily Income &amp; Expense Ledger</div>
  <div class="doc-period">Period: ${fromLabel} &mdash; ${toLabel}</div>
  <table>
    <thead>
      <tr>
        <th rowspan="2" class="date-cell" style="text-align:center;vertical-align:middle;">Date</th>
        <th colspan="${incomeCols.length + 1}" class="group-header income-cat">INCOME</th>
        <th colspan="${expenseCols.length + 1}" class="group-header expense-cat">EXPENSES</th>
      </tr>
      <tr>
        ${incomeHeaderCells}
        <th class="cat-header income-cat subtotal"><div class="rotated">Total Income</div></th>
        ${expenseHeaderCells}
        <th class="cat-header expense-cat subtotal"><div class="rotated">Total Expenses</div></th>
      </tr>
    </thead>
    <tbody>
      ${sortedDates.length === 0 ? `<tr><td colspan="${incomeCols.length + expenseCols.length + 3}" style="text-align:center;padding:16px;">No transactions in selected range</td></tr>` : dataRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td class="label-col">TOTAL</td>
        ${incomeTotalCells}
        <td class="subtotal income-cat">${fmt(grandTotalIncome)}</td>
        ${expenseTotalCells}
        <td class="subtotal expense-cat">${fmt(grandTotalExpenses)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      alert("Please allow pop-ups to export the report.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

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
      category:
        t.type === "credit"
          ? "Fee Collection"
          : t.type === "deposit"
            ? "Deposit"
            : "Expense",
      description: t.description,
      credit: t.type === "debit" ? t.amount : null,
      debit: t.type === "credit" || t.type === "deposit" ? t.amount : null,
      studentId: t.studentId,
      receiptNumber: t.receiptNumber,
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={handleExport}
          >
            <Printer className="h-4 w-4" />
            Export Report
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setPaymentModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
        </div>
        <AddStudentPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onSuccess={() => {
            const params = new URLSearchParams();
            if (dateFrom) params.set("from", dateFrom);
            if (dateTo) params.set("to", dateTo);
            const qs = params.toString() ? `?${params}` : "";
            fetch(`/api/dashboard${qs}`)
              .then((res) => res.json())
              .then((data) => {
                setStats({
                  instituteName: data.instituteName ?? "",
                  monthlyRevenue: data.monthlyRevenue ?? 0,
                  revenueChange: data.revenueChange ?? 0,
                  pendingDues: data.pendingDues ?? 0,
                  totalCollected: data.totalCollected ?? 0,
                  totalExpenses: data.totalExpenses ?? 0,
                });
              });
            fetch(`/api/transactions${qs}`)
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

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-gray-400">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
                    className={`transition-colors hover:bg-gray-50 ${row.studentId ? "cursor-pointer" : ""}`}
                    onClick={() =>
                      row.studentId && router.push(`/students/${row.studentId}`)
                    }
                  >
                    <td className="px-6 py-3 text-gray-800">{row.date}</td>
                    <td className="px-6 py-3 text-gray-800">{row.category}</td>
                    <td className="px-6 py-3 text-gray-800">
                      <span>{row.description}</span>
                      {row.receiptNumber && (
                        <span className="ml-2 text-xs text-blue-600 font-mono">
                          ({row.receiptNumber})
                        </span>
                      )}
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
