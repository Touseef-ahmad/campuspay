"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, ChevronDown, ChevronUp, Search } from "lucide-react";

interface Institute {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  type: string | null;
  isApproved: boolean;
  createdAt: string;
  _count: { users: number };
}

export default function InstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load(searchTerm = "") {
    setLoading(true);
    const params = searchTerm
      ? `?search=${encodeURIComponent(searchTerm)}`
      : "";
    const res = await fetch(`/api/institutes${params}`);
    if (res.ok) {
      setInstitutes(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch() {
    load(search);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/institutes/${id}/approve`, {
        method: "PUT",
      });
      if (res.ok) {
        setInstitutes((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isApproved: true } : i)),
        );
        setExpandedId(null);
      }
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/institutes/${id}/reject`, {
        method: "DELETE",
      });
      if (res.ok) {
        setInstitutes((prev) => prev.filter((i) => i.id !== id));
        setExpandedId(null);
      }
    } finally {
      setActionId(null);
    }
  }

  const pending = institutes.filter((i) => !i.isApproved);
  const approved = institutes.filter((i) => i.isApproved);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Monitor your institution&apos;s financial health and student
          enrollment.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search Institute"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Management Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold uppercase text-xs">
                  Institution Name
                </TableHead>
                <TableHead className="font-semibold uppercase text-xs">
                  Type
                </TableHead>
                <TableHead className="font-semibold uppercase text-xs">
                  Date Applied
                </TableHead>
                <TableHead className="font-semibold uppercase text-xs">
                  Status
                </TableHead>
                <TableHead className="font-semibold uppercase text-xs text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 && approved.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No institutes found.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Pending Institutes */}
                  {pending.map((institute) => (
                    <InstituteRow
                      key={institute.id}
                      institute={institute}
                      isExpanded={expandedId === institute.id}
                      onToggle={() =>
                        setExpandedId(
                          expandedId === institute.id ? null : institute.id,
                        )
                      }
                      onApprove={() => handleApprove(institute.id)}
                      onReject={() => handleReject(institute.id)}
                      isActioning={actionId === institute.id}
                    />
                  ))}
                  {/* Approved Institutes */}
                  {approved.map((institute) => (
                    <InstituteRow
                      key={institute.id}
                      institute={institute}
                      isExpanded={expandedId === institute.id}
                      onToggle={() =>
                        setExpandedId(
                          expandedId === institute.id ? null : institute.id,
                        )
                      }
                      onApprove={() => {}}
                      onReject={() => {}}
                      isActioning={false}
                    />
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InstituteRow({
  institute,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  isActioning,
}: {
  institute: Institute;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  isActioning: boolean;
}) {
  return (
    <>
      <TableRow className="hover:bg-muted/30">
        <TableCell className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">{institute.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {institute.type || "Institution"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {new Date(institute.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </TableCell>
        <TableCell>
          {institute.isApproved ? (
            <Badge className="bg-green-100 text-green-700">Approved</Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <button
            onClick={onToggle}
            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            View Details
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </TableCell>
      </TableRow>

      {/* Expanded Detail View */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={5} className="p-0">
            <div className="border-t bg-white p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Institution Information */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Institution Information
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Full Name
                      </dt>
                      <dd className="font-medium">{institute.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Type</dt>
                      <dd className="font-medium">{institute.type || "—"}</dd>
                      {/* TODO: Add type selector during registration */}
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Contact Email
                      </dt>
                      <dd className="font-medium">{institute.email || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Address</dt>
                      <dd className="font-medium">
                        {institute.address || "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Application Details */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Application Details
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Date Submitted
                      </dt>
                      <dd className="font-medium">
                        {new Date(institute.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Institution ID
                      </dt>
                      <dd className="font-mono text-sm">{institute.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Registered Users
                      </dt>
                      <dd className="font-medium">{institute._count.users}</dd>
                    </div>
                    {/* TODO: Add phone number field to schema and registration */}
                    {/* TODO: Add website field to schema and registration */}
                  </dl>
                </div>
              </div>

              {/* Action Footer */}
              {!institute.isApproved && (
                <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={onReject}
                    disabled={isActioning}
                  >
                    {isActioning ? "Rejecting..." : "Reject"}
                  </Button>
                  <Button onClick={onApprove} disabled={isActioning}>
                    {isActioning ? "Approving..." : "Approve"}
                  </Button>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
