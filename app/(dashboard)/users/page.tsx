"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Users } from "lucide-react";

interface User {
  id: string;
  email: string;
  isApproved: boolean;
  createdAt: string;
  role: { name: string } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/users/${id}/approve`, { method: "PUT" });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isApproved: true } : u)),
        );
      }
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/users/${id}/reject`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      }
    } finally {
      setActionId(null);
    }
  }

  const pending = users.filter((u) => !u.isApproved);
  const approved = users.filter((u) => u.isApproved);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      {/* Pending approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pending Approvals
            {pending.length > 0 && (
              <Badge variant="destructive">{pending.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending approval requests.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role?.name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(user.id)}
                          disabled={actionId === user.id}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(user.id)}
                          disabled={actionId === user.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approved users */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Users</CardTitle>
        </CardHeader>
        <CardContent>
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved users.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role?.name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Approved</Badge>
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
