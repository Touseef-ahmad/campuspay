"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeftRight, MinusCircle, Banknote } from "lucide-react";

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

interface ExpenseCategory {
  id: string;
  name: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

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
    const [aRes, eRes, cRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/expenses"),
      fetch("/api/expense-categories"),
    ]);
    const [a, e, c] = await Promise.all([
      aRes.json(),
      eRes.json(),
      cRes.json(),
    ]);
    setAccounts(Array.isArray(a) ? a : []);
    setExpenses(Array.isArray(e) ? e : []);
    setCategories(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex gap-2">
          {/* Record Expense */}
          <Dialog open={expOpen} onOpenChange={setExpOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MinusCircle className="mr-2 h-4 w-4" />
                Record Expense
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
                  <Select
                    value={expForm.categoryId}
                    onValueChange={(v) =>
                      setExpForm((p) => ({ ...p, categoryId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Button>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
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

      {/* Account Balances */}
      <div className="grid gap-4 sm:grid-cols-2">
        {loading
          ? [...Array(2)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))
          : accounts.map((a) => (
              <Card key={a.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">
                    {a.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{a.type}</Badge>
                    {a.isDefault && <Badge variant="outline">Default</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {fmt(Number(a.balance))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 animate-pulse rounded bg-muted" />
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expenses recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 20).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>{e.category?.name}</TableCell>
                    <TableCell>{e.financialAccount?.name}</TableCell>
                    <TableCell>
                      {new Date(e.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      -{fmt(Number(e.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
