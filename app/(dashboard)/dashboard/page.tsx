"use client";

import { useState } from "react";
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

// ---------------------------------------------------------------------------
// Static sample data – replace with real API calls when endpoints are ready
// TODO: fetch KPI values from /api/dashboard
// ---------------------------------------------------------------------------
const KPI_CARDS = [
  {
    label: "Total Monthly Revenue",
    value: "RS 248,500",
    trend: "up",
    trendText: "12.5% from last month",
    icon: LineChart,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    label: "Total Due Fees",
    value: "RS 42,350",
    trend: "down",
    trendText: "3.2% pending collection",
    icon: AlertTriangle,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    label: "Total Amount Credited",
    value: "RS 200K",
    trend: "up",
    trendText: "24 new this week",
    icon: Wallet,
    iconBg: "bg-green-50",
    iconColor: "text-green-500",
  },
  {
    label: "Total Amount Debited",
    value: "RS 600K",
    trend: "up",
    trendText: "This semester",
    icon: CreditCard,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-500",
  },
];

// ---------------------------------------------------------------------------
// Static ledger rows – replace with real API calls when endpoints are ready
// TODO: fetch from /api/transactions and map to this shape
// ---------------------------------------------------------------------------
type LedgerRow = {
  id: number;
  date: string;
  category: "Fee Collection" | "Expense";
  description: string;
  credit: string | null;
  debit: string | null;
};

const LEDGER_ROWS: LedgerRow[] = [
  {
    id: 1,
    date: "2-Mar-2026",
    category: "Fee Collection",
    description: "Arslan paid registration fee",
    credit: null,
    debit: "200k",
  },
  {
    id: 2,
    date: "3-Mar-2026",
    category: "Expense",
    description: "Paid salary to Saad employee",
    credit: "100k",
    debit: null,
  },
  {
    id: 3,
    date: "5-Mar-2026",
    category: "Fee Collection",
    description: "Bilal paid semester fee",
    credit: null,
    debit: "150k",
  },
  {
    id: 4,
    date: "6-Mar-2026",
    category: "Expense",
    description: "Office supplies purchased",
    credit: "15k",
    debit: null,
  },
  {
    id: 5,
    date: "8-Mar-2026",
    category: "Fee Collection",
    description: "Hina paid admission fee",
    credit: null,
    debit: "80k",
  },
  {
    id: 6,
    date: "10-Mar-2026",
    category: "Expense",
    description: "Utility bills payment",
    credit: "30k",
    debit: null,
  },
  {
    id: 7,
    date: "12-Mar-2026",
    category: "Fee Collection",
    description: "Usman paid tuition fee",
    credit: null,
    debit: "120k",
  },
  {
    id: 8,
    date: "14-Mar-2026",
    category: "Expense",
    description: "Maintenance & repair work",
    credit: "45k",
    debit: null,
  },
  {
    id: 9,
    date: "16-Mar-2026",
    category: "Fee Collection",
    description: "Sana paid exam fee",
    credit: null,
    debit: "60k",
  },
  {
    id: 10,
    date: "18-Mar-2026",
    category: "Expense",
    description: "Paid salary to Ali employee",
    credit: "240k",
    debit: null,
  },
];

// ---------------------------------------------------------------------------
// Category filter options
// TODO: fetch categories dynamically from /api/expense-categories
// ---------------------------------------------------------------------------
const CATEGORIES = ["All", "Fee Collection", "Expense"];

export default function DashboardPage() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  // TODO: wire dateFilter to a real date-picker component
  const [dateFilter] = useState("18-Mar-2026");

  const filteredRows =
    categoryFilter === "All"
      ? LEDGER_ROWS
      : LEDGER_ROWS.filter((r) => r.category === categoryFilter);

  return (
    <div className="min-h-screen bg-[#F8F9FA] space-y-6">
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
        {/* TODO: wire "Add Payment" to open a payment modal */}
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4" />
          Add Payment
        </Button>
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
              className="bg-white rounded-lg border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{card.label}</span>
                <span
                  className={`inline-flex items-center justify-center h-8 w-8 rounded ${card.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {card.value}
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
      <div className="bg-white rounded-lg border border-gray-200 px-5 py-4 flex flex-wrap items-center gap-6">
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Category</span>
          {/* TODO: replace with a proper <Select> dropdown component */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none border border-gray-200 rounded-md text-sm px-3 py-1.5 pr-7 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Date</span>
          {/* TODO: replace with a real date-picker (e.g. react-day-picker) */}
          <div className="relative">
            <input
              type="text"
              readOnly
              value={dateFilter}
              className="border border-gray-200 rounded-md text-sm px-3 py-1.5 pr-8 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
            <Calendar className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Financial Ledger Table                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
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
                      className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-800">{row.date}</td>
                  <td className="px-6 py-3 text-gray-800">{row.category}</td>
                  <td className="px-6 py-3 text-gray-800">{row.description}</td>
                  <td className="px-6 py-3 font-medium">
                    {row.credit ? (
                      <span className="text-red-500">{row.credit}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {row.debit ? (
                      <span className="text-green-600">{row.debit}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Summary footer */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td
                  colSpan={3}
                  className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  Total Amount
                </td>
                <td className="px-6 py-3 font-bold text-red-500 text-sm">
                  CREDIT: 430K
                </td>
                <td className="px-6 py-3 font-bold text-green-600 text-sm">
                  {/* TODO: compute totals dynamically from filtered rows */}
                  DEBIT: 800K
                  <span className="ml-6 text-blue-600">TOTAL: 1200K</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
