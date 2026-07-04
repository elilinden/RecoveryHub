"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InviteUserDialog } from "@/components/settings/user-management/invite-user-dialog";
import { UserRowMenu } from "@/components/settings/user-management/user-row-menu";
import { AccountStatusBadge, ActiveStatusBadge, RoleBadge } from "@/components/settings/user-management/user-status-badges";
import { roleLabels } from "@/lib/users/labels";
import type { ManagedUser, UserActionResult } from "@/lib/users/types";
import { cn } from "@/lib/utils";

const timestampFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  return timestampFormatter.format(new Date(value));
}

type UserManagementSettingsProps = {
  users: ManagedUser[] | null;
  currentAdminId: string;
};

export function UserManagementSettings({ users, currentAdminId }: UserManagementSettingsProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [feedback, setFeedback] = useState<UserActionResult | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const refresh = () => startRefresh(() => router.refresh());

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (statusFilter === "active" && !user.isActive) return false;
      if (statusFilter === "inactive" && user.isActive) return false;
      if (q && !user.fullName.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (users === null) {
    return (
      <div className="mt-5 rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-4 py-5 text-sm text-[var(--urgent)]">
        We could not load users. Try refreshing the page.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Search by name or email</span>
            <Input
              className="h-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              type="search"
              value={search}
            />
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              onChange={(event) => setRoleFilter(event.target.value)}
              value={roleFilter}
            >
              <option value="">All roles</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <InviteUserDialog onResult={setFeedback} refresh={refresh} />
      </div>

      {feedback ? (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm",
            feedback.ok ? "bg-[var(--success-muted)] text-[var(--success)]" : "bg-[var(--urgent-muted)] text-[var(--urgent)]"
          )}
          role="status"
        >
          <span>{feedback.message}</span>
          <button aria-label="Dismiss message" className="shrink-0 text-current" onClick={() => setFeedback(null)} type="button">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
          <Users aria-hidden="true" className="size-6" />
          <p>No users yet. Invite your first colleague to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
          <p>No users match your search or filters.</p>
          <Button
            onClick={() => {
              setSearch("");
              setRoleFilter("");
              setStatusFilter("");
            }}
            type="button"
            variant="ghost"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className={cn("overflow-x-auto rounded-lg border border-border", isRefreshing && "opacity-60")} aria-busy={isRefreshing}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Date added</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {user.fullName}
                      {user.id === currentAdminId ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(You)</span> : null}
                    </div>
                    <div className="text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.jobTitle || "—"}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <ActiveStatusBadge isActive={user.isActive} />
                  </TableCell>
                  <TableCell>
                    <AccountStatusBadge status={user.accountStatus} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatTimestamp(user.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTimestamp(user.lastSignInAt)}</TableCell>
                  <TableCell className="text-right">
                    <UserRowMenu isSelf={user.id === currentAdminId} onResult={setFeedback} refresh={refresh} user={user} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
