"use client";

import * as React from "react";
import { Download, Trash2, Monitor, Globe } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAccount, updateProfile } from "@/server/actions/profile";
import { changePassword, setPassword } from "@/server/actions/password";
import { revokeSession } from "@/server/actions/sessions";
import { exportUserData } from "@/server/actions/export";
import type { SessionRow } from "@/server/queries/sessions";
import type { AiKeyRow } from "@/server/queries/ai-keys";
import { AiKeysCard, type AiKeyProviderOption } from "./ai-keys-card";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "ai-keys", label: "AI keys" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
  { id: "data", label: "Data & privacy" },
];

const LOCALE_OPTIONS = [{ value: "en", label: "English" }];

interface Props {
  userName: string;
  userEmail: string;
  userLocale: string;
  hasPassword: boolean;
  sessions: SessionRow[];
  aiKeys: AiKeyRow[];
  aiKeyProviders: AiKeyProviderOption[];
}

export function SettingsClient({ userName, userEmail, userLocale, hasPassword, sessions, aiKeys, aiKeyProviders }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState("profile");
  // /settings#ai-keys opens the keys tab; the generator links here when a user has no key yet.
  React.useEffect(() => {
    if (window.location.hash === "#ai-keys") setTab("ai-keys");
  }, []);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Profile
  const [displayName, setDisplayName] = React.useState(userName);
  const [isSaving, setIsSaving] = React.useState(false);
  const initials = userName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "ME";

  // Preferences
  const [locale, setLocale] = React.useState(userLocale);
  const [isSavingLocale, setIsSavingLocale] = React.useState(false);

  // Security — Password
  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [isSavingPwd, setIsSavingPwd] = React.useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name: displayName });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLocale = async (newLocale: string) => {
    setLocale(newLocale);
    setIsSavingLocale(true);
    try {
      await updateProfile({ locale: newLocale });
      toast.success("Language updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update language");
      setLocale(userLocale);
    } finally {
      setIsSavingLocale(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error("Passwords don't match"); return; }
    if (newPwd.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setIsSavingPwd(true);
    try {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success("Password updated");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsSavingPwd(false);
    }
  };

  const handleSetPassword = async () => {
    if (newPwd !== confirmPwd) { toast.error("Passwords don't match"); return; }
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setIsSavingPwd(true);
    try {
      await setPassword({ newPassword: newPwd });
      toast.success("Password set — you can now sign in with email and password");
      setNewPwd(""); setConfirmPwd("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setIsSavingPwd(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      toast.success("Session revoked");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session");
    }
  };

  const handleExport = async () => {
    try {
      const { data, filename } = await exportUserData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-7 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-[760px]">
        {/* Profile */}
        {tab === "profile" && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-[15px] mb-4">Personal info</h3>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent text-primary-text flex items-center justify-center text-xl font-semibold">
                {initials}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue={userName.toLowerCase().replace(/\s/g, "")} disabled />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={userEmail} disabled />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={isSaving || displayName === userName}
              >
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDisplayName(userName)} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Preferences */}
        {tab === "preferences" && (
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-5">
            <h3 className="font-semibold text-[15px]">Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Language</Label>
                <select
                  className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={locale}
                  disabled={isSavingLocale}
                  onChange={(e) => handleSaveLocale(e.target.value)}
                >
                  {LOCALE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {tab === "ai-keys" && <AiKeysCard keys={aiKeys} providers={aiKeyProviders} />}

        {/* Security */}
        {tab === "security" && (
          <div className="flex flex-col gap-4">
            {/* Password — conditional: set (OAuth-only) vs change (has password) */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-[15px] mb-1">
                {hasPassword ? "Password" : "Set a password"}
              </h3>
              {!hasPassword && (
                <p className="text-sm text-text-muted mb-4">
                  Bu hesap sosyal giriş ile bağlandı. Şifre belirleyerek email + şifre ile de giriş yapabilirsin.
                </p>
              )}
              <div className="flex flex-col gap-3 max-w-[380px]">
                {hasPassword && (
                  <PasswordInput
                    placeholder="Current password"
                    autoComplete="current-password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                  />
                )}
                <PasswordInput
                  placeholder="New password (min 8 chars)"
                  autoComplete="new-password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                <PasswordInput
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
                <Button
                  size="sm"
                  className="self-start mt-1"
                  onClick={hasPassword ? handleChangePassword : handleSetPassword}
                  disabled={
                    isSavingPwd ||
                    !newPwd ||
                    !confirmPwd ||
                    (hasPassword && !currentPwd)
                  }
                >
                  {isSavingPwd
                    ? (hasPassword ? "Updating…" : "Setting…")
                    : (hasPassword ? "Update password" : "Set password")}
                </Button>
              </div>
            </div>

            {/* Active sessions */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-[15px] mb-4">Active sessions</h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-text-muted">No active sessions found.</p>
              ) : (
                <div className="flex flex-col">
                  {sessions.map((s, i) => (
                    <div
                      key={s.id}
                      className={`flex justify-between items-center py-3 ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        {s.isCurrent ? (
                          <Monitor className="h-4 w-4 text-text-muted shrink-0" />
                        ) : (
                          <Globe className="h-4 w-4 text-text-muted shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {s.isCurrent ? "Current session" : "Session"}
                          </p>
                          <p className="text-xs text-text-faint mt-0.5">Expires {s.expires}</p>
                        </div>
                      </div>
                      {s.isCurrent ? (
                        <Badge variant="primary">Current</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(s.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data */}
        {tab === "data" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-[15px]">Export your data</h3>
              <p className="text-sm text-text-muted mt-1.5">
                Download all your prompts, favorites, and metadata as a JSON file.
              </p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Request export
              </Button>
            </div>
            <div className="rounded-xl border border-error/30 bg-error/5 p-6">
              <h3 className="font-semibold text-[15px] text-error">Delete account</h3>
              <p className="text-sm text-text-muted mt-1.5">
                This permanently deletes your account, prompts, and billing history. Cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-4"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete account…
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete your account?"
        description="This permanently removes your account, all prompts, favorites, and billing history. This action cannot be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={async () => {
          try {
            await deleteAccount();
            toast.success("Account deleted");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete account");
          }
        }}
      />
    </div>
  );
}
