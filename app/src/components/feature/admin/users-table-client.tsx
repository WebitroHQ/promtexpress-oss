"use client";

import * as React from "react";
import { Filter, Download, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  suspendUser,
  unsuspendUser,
  changeUserPlan,
  inviteUser,
  deleteUser,
} from "@/server/actions/admin-users";

type UserRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  credits: number;
  joined: string;
  status: "Active" | "Suspended";
  country: string;
  suspendReason: string | null;
};

type PlanOption = { id: string; name: string };

interface Props {
  users: UserRow[];
  totalUsers: number;
  plans: PlanOption[];
}

function initials(name: string): string {
  return name.split(" ").map((s) => s[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

export function UsersTableClient({ users, totalUsers, plans }: Props) {
  const [filter, setFilter] = React.useState<"All" | "Active" | "Suspended">("All");
  const [search, setSearch] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [showInvite, setShowInvite] = React.useState(false);
  const [changingPlanFor, setChangingPlanFor] = React.useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>("");

  const filtered = users.filter((u) => {
    if (filter !== "All" && u.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handleSuspend(id: string) {
    const reason = window.prompt("Suspension reason:", "");
    if (!reason || !reason.trim()) return;
    setBusy(id);
    try {
      await suspendUser({ userId: id, reason: reason.trim() });
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
      setOpenMenu(null);
    }
  }

  async function handleUnsuspend(id: string) {
    setBusy(id);
    try {
      await unsuspendUser(id);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
      setOpenMenu(null);
    }
  }

  function openChangePlan(id: string) {
    setSelectedPlanId(plans[0]?.id ?? "");
    setChangingPlanFor(id);
    setOpenMenu(null);
  }

  async function submitChangePlan() {
    if (!changingPlanFor || !selectedPlanId) return;
    setBusy(changingPlanFor);
    try {
      await changeUserPlan({ userId: changingPlanFor, planId: selectedPlanId });
      setChangingPlanFor(null);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!window.confirm(`Permanently delete user ${email}?`)) return;
    setBusy(id);
    try {
      await deleteUser(id);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
      setOpenMenu(null);
    }
  }

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const role = (fd.get("role") as "USER" | "ADMIN") ?? "USER";
    if (!email) return;
    try {
      await inviteUser({ email, role });
      setShowInvite(false);
    } catch (err) {
      window.alert((err as Error).message);
    }
  }

  function exportCsv() {
    const header = ["Name", "Email", "Plan", "Country", "Joined", "Status"].join(",");
    const rows = filtered.map((u) =>
      [u.name, u.email, u.plan, u.country, u.joined, u.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <div className="text-xs text-text-muted">{filtered.length} of {totalUsers.toLocaleString()} users</div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setFilter(filter === "All" ? "Active" : filter === "Active" ? "Suspended" : "All")}>
            <Filter className="h-3.5 w-3.5" /> {filter}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <Plus className="h-3.5 w-3.5" /> Invite
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm w-[280px] focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Search by name or email…"
        />
        {(["All", "Active", "Suspended"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              filter === c ? "bg-surface border-border-strong" : "border-border text-text-muted hover:text-text"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {["User", "Plan", "Credits", "Country", "Joined", "Status", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent text-primary-text flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(u.name)}
                    </div>
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-text-faint">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.plan === "Pro" || u.plan === "Enterprise" ? "primary" : "default"}>{u.plan}</Badge>
                </td>
                <td className="px-4 py-3 tabular-nums text-text-muted">{u.credits.toLocaleString()}</td>
                <td className="px-4 py-3 text-text-muted">{u.country}</td>
                <td className="px-4 py-3 text-text-muted">{u.joined}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.status === "Suspended" ? "error" : "success"}>{u.status}</Badge>
                  {u.suspendReason && <div className="text-[10px] text-text-faint mt-0.5">{u.suspendReason}</div>}
                </td>
                <td className="px-4 py-3 relative">
                  <button
                    disabled={busy === u.id}
                    onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                    className="p-1 rounded text-text-muted hover:bg-surface transition-colors disabled:opacity-50"
                    aria-label={`Actions for ${u.name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenu === u.id && (
                    <div className="absolute right-2 top-9 z-10 bg-surface border border-border rounded-md shadow-lg w-44 py-1">
                      <button onClick={() => openChangePlan(u.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2">Change plan…</button>
                      <a href={`/pr/yonet/users/${u.id}/credits`} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2">Credits…</a>
                      {u.status === "Active" ? (
                        <button onClick={() => handleSuspend(u.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2">Suspend…</button>
                      ) : (
                        <button onClick={() => handleUnsuspend(u.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2">Unsuspend</button>
                      )}
                      <button onClick={() => handleDelete(u.id, u.email)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2 text-error">Delete…</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">No results</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setShowInvite(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleInvite} className="bg-surface border border-border rounded-xl p-5 w-[400px]">
            <h3 className="font-semibold mb-3">Invite user</h3>
            <label className="block text-xs text-text-muted mb-1">Email</label>
            <input name="email" type="email" required className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <label className="block text-xs text-text-muted mb-1">Role</label>
            <select name="role" defaultValue="USER" className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-4">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button type="submit" size="sm">Invite</Button>
            </div>
          </form>
        </div>
      )}

      {changingPlanFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setChangingPlanFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-surface border border-border rounded-xl p-5 w-[360px]">
            <h3 className="font-semibold mb-3">Change plan</h3>
            <label className="block text-xs text-text-muted mb-1">New plan</label>
            <select
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setChangingPlanFor(null)}>Cancel</Button>
              <Button
                type="button"
                size="sm"
                disabled={!selectedPlanId || busy === changingPlanFor}
                onClick={submitChangePlan}
              >
                {busy === changingPlanFor ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
