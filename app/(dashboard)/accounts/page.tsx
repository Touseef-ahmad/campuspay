"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Plus, Wallet, CalendarIcon } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  isDefault: boolean;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: { name: string };
  financialAccount: { name: string };
}

interface Transfer {
  id: string;
  amount: number;
  date: string;
  fromAccount: { id: string; name: string };
  toAccount: { id: string; name: string };
}

interface ExpenseCategory {
  id: string;
  name: string;
}

type LedgerEntry = {
  id: string;
  date: string;
  type: "Expense" | "Transfer";
  account: string;
  description: string;
  amount: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "expense" | "transfer"
  >("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Add Account modal
  const [accOpen, setAccOpen] = useState(false);
  const [accForm, setAccForm] = useState({
    name: "",
    type: "Bank",
    balance: "",
  });
  const [accSaving, setAccSaving] = useState(false);
  const [accError, setAccError] = useState("");

  // Expense modal
  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    title: "",
    amount: "",
    categoryId: "",
    financialAccountId: "",
  });
  const [expSaving, setExpSaving] = useState(false);
  const [expError, setExpError] = useState("");

  // Transfer modal
  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
  });
  const [txSaving, setTxSaving] = useState(false);
  const [txError, setTxError] = useState("");

  async function load() {
    const [aRes, eRes, tRes, cRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/expenses"),
      fetch("/api/transfers"),
      fetch("/api/expense-categories"),
    ]);
    const [a, e, t, c] = await Promise.all([
      aRes.json(),
      eRes.json(),
      tRes.json(),
      cRes.json(),
    ]);
    setAccounts(Array.isArray(a) ? a : []);
    setExpenses(Array.isArray(e) ? e : []);
    setTransfers(Array.isArray(t) ? t : []);
    setCategories(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Combined ledger entries
  const ledgerEntries = useMemo<LedgerEntry[]>(() => {
    const entries: LedgerEntry[] = [];

    expenses.forEach((e) => {
      entries.push({
        id: `exp-${e.id}`,
        date: e.date,
        type: "Expense",
        account: e.financialAccount?.name || "Unknown",
        description: e.title,
        amount: Number(e.amount),
      });
    });

    transfers.forEach((t) => {
      entries.push({
        id: `txf-${t.id}`,
        date: t.date,
        type: "Transfer",
        account: `${t.fromAccount?.name} → ${t.toAccount?.name}`,
        description: `Transfer from ${t.fromAccount?.name} to ${t.toAccount?.name}`,
        amount: Number(t.amount),
      });
    });

    // Sort by date descending
    entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return entries;
  }, [expenses, transfers]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      // Category filter
      if (categoryFilter === "expense" && entry.type !== "Expense")
        return false;
      if (categoryFilter === "transfer" && entry.type !== "Transfer")
        return false;

      // Date filter
      if (dateFilter) {
        const entryDate = new Date(entry.date).toISOString().split("T")[0];
        if (entryDate !== dateFilter) return false;
      }

      return true;
    });
  }, [ledgerEntries, categoryFilter, dateFilter]);

  // Summary totals
  const summary = useMemo(() => {
    const expenseTotal = filteredEntries
      .filter((e) => e.type === "Expense")
      .reduce((sum, e) => sum + e.amount, 0);
    const transferTotal = filteredEntries
      .filter((e) => e.type === "Transfer")
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      expense: expenseTotal,
      transfer: transferTotal,
      total: expenseTotal + transferTotal,
    };
  }, [filteredEntries]);

  const mainAccount = accounts.find((a) => a.isDefault);
  const otherAccounts = accounts.filter((a) => !a.isDefault);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccError("");
    setAccSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accForm.name,
          type: accForm.type,
          balance: accForm.balance ? Number(accForm.balance) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccError(data.error ?? "Failed");
        return;
      }
      setAccOpen(false);
      setAccForm({ name: "", type: "Bank", balance: "" });
      load();
    } finally {
      setAccSaving(false);
    }
  }

  async function handleExpense(e: React.FormEvent) {
    e.preventDefault();
    setExpError("");
    setExpSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...expForm, amount: Number(expForm.amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExpError(data.error ?? "Failed");
        return;
      }
      setExpOpen(false);
      setExpForm({
        title: "",
        amount: "",
        categoryId: "",
        financialAccountId: "",
      });
      load();
    } finally {
      setExpSaving(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTxError("");
    setTxSaving(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...txForm, amount: Number(txForm.amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTxError(data.error ?? "Failed");
        return;
      }
      setTxOpen(false);
      setTxForm({ fromAccountId: "", toAccountId: "", amount: "" });
      load();
    } finally {
      setTxSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex gap-2">
          {/* Record Expense */}
          <Dialog open={expOpen} onOpenChange={setExpOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Record Expenses
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleExpense} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={expForm.title}
                    onChange={(e) =>
                      setExpForm((p) => ({ ...p, title: e.target.value }))
                    }
                    required
                    placeholder="Office supplies"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expForm.amount}
                    onChange={(e) =>
                      setExpForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <CreatableSelect
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={expForm.categoryId}
                    onChange={(v) =>
                      setExpForm((p) => ({ ...p, categoryId: v }))
                    }
                    onCreate={async (name) => {
                      try {
                        const res = await fetch("/api/expense-categories", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name }),
                        });
                        if (!res.ok) return null;
                        const newCategory = await res.json();
                        setCategories((prev) => [...prev, newCategory]);
                        return {
                          value: newCategory.id,
                          label: newCategory.name,
                        };
                      } catch {
                        return null;
                      }
                    }}
                    placeholder="Select or create category"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deduct from Account</Label>
                  <Select
                    value={expForm.financialAccountId}
                    onValueChange={(v) =>
                      setExpForm((p) => ({ ...p, financialAccountId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({fmt(Number(a.balance))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {expError && (
                  <p className="text-sm text-destructive">{expError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setExpOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={expSaving}>
                    {expSaving ? "Saving…" : "Record Expense"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Transfer Funds */}
          <Dialog open={txOpen} onOpenChange={setTxOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Transfer Funds
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Funds</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>From Account</Label>
                  <Select
                    value={txForm.fromAccountId}
                    onValueChange={(v) =>
                      setTxForm((p) => ({ ...p, fromAccountId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({fmt(Number(a.balance))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Account</Label>
                  <Select
                    value={txForm.toAccountId}
                    onValueChange={(v) =>
                      setTxForm((p) => ({ ...p, toAccountId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== txForm.fromAccountId)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({fmt(Number(a.balance))})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={txForm.amount}
                    onChange={(e) =>
                      setTxForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    required
                  />
                </div>
                {txError && (
                  <p className="text-sm text-destructive">{txError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTxOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={txSaving}>
                    {txSaving ? "Transferring…" : "Transfer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Cards */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 w-48 shrink-0 animate-pulse rounded-xl bg-muted"
            />
          ))
        ) : (
          <>
            {/* Main Account (Default) - Blue */}
            {mainAccount && (
              <Card className="shrink-0 w-56 bg-blue-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      <span className="font-medium">{mainAccount.name}</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white hover:bg-white/30 text-xs"
                    >
                      DEFAULT
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mt-3">
                    {fmt(Number(mainAccount.balance))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secondary Accounts - White */}
            {otherAccounts.map((a) => (
              <Card key={a.id} className="shrink-0 w-56 border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{a.name}</span>
                  </div>
                  <div className="text-2xl font-bold mt-3">
                    {fmt(Number(a.balance))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Account Card */}
            <Dialog open={accOpen} onOpenChange={setAccOpen}>
              <DialogTrigger asChild>
                <Card className="shrink-0 w-48 border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-22">
                    <Plus className="h-8 w-8 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">
                      Add Account
                    </span>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddAccount} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      value={accForm.name}
                      onChange={(e) =>
                        setAccForm((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                      placeholder="e.g., Savings, Emergency Fund"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={accForm.type}
                      onValueChange={(v) =>
                        setAccForm((p) => ({ ...p, type: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank">Bank</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Opening Balance</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={accForm.balance}
                      onChange={(e) =>
                        setAccForm((p) => ({ ...p, balance: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  {accError && (
                    <p className="text-sm text-destructive">{accError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAccOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={accSaving}>
                      {accSaving ? "Creating…" : "Create Account"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select
          value={categoryFilter}
          onValueChange={(v) =>
            setCategoryFilter(v as "all" | "expense" | "transfer")
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 w-44"
          />
        </div>

        {(categoryFilter !== "all" || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCategoryFilter("all");
              setDateFilter("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Financial Ledger */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-64 animate-pulse bg-muted" />
          ) : filteredEntries.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-32 h-32 mb-6 text-muted-foreground/30">
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  className="w-full h-full"
                >
                  <rect
                    x="15"
                    y="20"
                    width="70"
                    height="60"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <line
                    x1="15"
                    y1="35"
                    x2="85"
                    y2="35"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <line
                    x1="35"
                    y1="20"
                    x2="35"
                    y2="80"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="40"
                    y="42"
                    width="20"
                    height="4"
                    rx="1"
                    fill="currentColor"
                    opacity="0.5"
                  />
                  <rect
                    x="40"
                    y="52"
                    width="35"
                    height="4"
                    rx="1"
                    fill="currentColor"
                    opacity="0.5"
                  />
                  <rect
                    x="40"
                    y="62"
                    width="25"
                    height="4"
                    rx="1"
                    fill="currentColor"
                    opacity="0.5"
                  />
                  <rect
                    x="20"
                    y="42"
                    width="10"
                    height="4"
                    rx="1"
                    fill="currentColor"
                    opacity="0.5"
                  />
                  <rect
                    x="20"
                    y="52"
                    width="10"
                    height="4"
                    rx="1"
                    fill="currentColor"
                    opacity="0.5"
                  />
                  <rect
                    x="20"
                    y="62"
                    width="10"
                    height="4"
                    rx="1"
                    fill="currentColor"
                    opacity="0.5"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                No Record Found
              </h3>
              <p className="text-sm text-muted-foreground/70">
                {dateFilter || categoryFilter !== "all"
                  ? "No transactions match your filters"
                  : "Start recording expenses or transfers"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-28">Category</TableHead>
                    <TableHead>Account & Description</TableHead>
                    <TableHead className="text-right w-32">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.type === "Expense" ? "destructive" : "default"
                          }
                          className={
                            entry.type === "Transfer"
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                              : ""
                          }
                        >
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.account}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {fmt(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary Footer */}
              <div className="border-t bg-muted/30 px-4 py-3 flex items-center justify-end gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    EXPENSE:
                  </span>
                  <span className="font-bold text-red-600">
                    {fmtShort(summary.expense)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    TRANSFER:
                  </span>
                  <span className="font-bold text-green-600">
                    {fmtShort(summary.transfer)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">TOTAL:</span>
                  <span className="font-bold">{fmtShort(summary.total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
