"use client";

import { useMemo, useState } from "react";
import { apiFetchClient } from "@/lib/api.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Pencil, Archive, RotateCcw, XCircle } from "lucide-react";

type AccountType = "developer" | "company" | "admin";

interface AdminAccount {
  id: string;
  userId: string;
  accountType: AccountType;
  archivedAt?: string | null;
  githubUsername?: string | null;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    industry?: string | null;
    size?: string | null;
    websiteUrl?: string | null;
    contactEmail?: string | null;
    archivedAt?: string | null;
  } | null;
}

interface AdminAccountsManagerProps {
  initialAccounts: AdminAccount[];
}

const EMPTY_FORM = {
  email: "",
  password: "",
  accountType: "company" as AccountType,
  companyName: "",
  industry: "",
  size: "",
  websiteUrl: "",
  contactEmail: "",
  values: "",
};

export default function AdminAccountsManager({ initialAccounts }: AdminAccountsManagerProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.userId === selectedUserId) || null,
    [accounts, selectedUserId]
  );

  const reset = () => {
    setSelectedUserId(null);
    setForm(EMPTY_FORM);
  };

  const loadAccount = (account: AdminAccount) => {
    setSelectedUserId(account.userId);
    setForm({
      email: "",
      password: "",
      accountType: account.accountType,
      companyName: account.company?.name || "",
      industry: account.company?.industry || "",
      size: account.company?.size || "",
      websiteUrl: account.company?.websiteUrl || "",
      contactEmail: account.company?.contactEmail || "",
      values: "",
    });
    setError(null);
    setSuccess(null);
  };

  const applyAccountResponse = (payload: any) => {
    const profile = payload.profile ?? payload;
    const account: AdminAccount = {
      id: profile.id,
      userId: profile.userId,
      accountType: profile.accountType,
      archivedAt: profile.archivedAt,
      githubUsername: profile.githubUsername,
      createdAt: profile.createdAt,
      company: profile.company
        ? {
            id: profile.company.id,
            name: profile.company.name,
            industry: profile.company.industry,
            size: profile.company.size,
            websiteUrl: profile.company.websiteUrl,
            contactEmail: profile.company.contactEmail,
            archivedAt: profile.company.archivedAt,
          }
        : null,
    };

    setAccounts((current) => {
      const filtered = current.filter((item) => item.userId !== account.userId);
      return [account, ...filtered].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    });
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetchClient("/admin/accounts", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password || undefined,
          accountType: form.accountType,
          companyName: form.companyName || undefined,
          industry: form.industry || undefined,
          size: form.size || undefined,
          websiteUrl: form.websiteUrl || undefined,
          contactEmail: form.contactEmail || undefined,
          values: form.values
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to create account.");
      }

      const created = await response.json();
      applyAccountResponse(created);
      setSuccess(`Created account for ${created.email}. Temporary password: ${created.password}`);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAccount) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetchClient(`/admin/accounts/${selectedAccount.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          accountType: form.accountType,
          companyName: form.companyName || undefined,
          industry: form.industry || undefined,
          size: form.size || undefined,
          websiteUrl: form.websiteUrl || undefined,
          contactEmail: form.contactEmail || undefined,
          values: form.values
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update account.");
      }

      const updated = await response.json();
      applyAccountResponse(updated);
      setSuccess("Account updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (account: AdminAccount) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetchClient(`/admin/accounts/${account.userId}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !account.archivedAt }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to archive account.");
      }

      const updated = await response.json();
      applyAccountResponse(updated);
      setSuccess(account.archivedAt ? "Account restored." : "Account archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{selectedAccount ? "Edit account" : "Create account"}</CardTitle>
          <CardDescription>
            Admins can provision developer, company, or admin accounts and archive them later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={selectedAccount ? handleSave : handleCreate}>
            {!selectedAccount && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="person@example.com" required />
              </div>
            )}

            {!selectedAccount && (
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" type="text" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} placeholder="Leave blank to generate one" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="accountType">Account type</Label>
              <select
                id="accountType"
                value={form.accountType}
                onChange={(e) => setForm((current) => ({ ...current, accountType: e.target.value as AccountType }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="developer">Developer</option>
                <option value="company">Company</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {form.accountType === "company" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" value={form.companyName} onChange={(e) => setForm((current) => ({ ...current, companyName: e.target.value }))} placeholder="Acme Tech" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" value={form.industry} onChange={(e) => setForm((current) => ({ ...current, industry: e.target.value }))} placeholder="Technology" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input id="size" value={form.size} onChange={(e) => setForm((current) => ({ ...current, size: e.target.value }))} placeholder="51-200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input id="websiteUrl" value={form.websiteUrl} onChange={(e) => setForm((current) => ({ ...current, websiteUrl: e.target.value }))} placeholder="https://example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact email</Label>
                  <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => setForm((current) => ({ ...current, contactEmail: e.target.value }))} placeholder="talent@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="values">Values</Label>
                  <Input id="values" value={form.values} onChange={(e) => setForm((current) => ({ ...current, values: e.target.value }))} placeholder="Ownership, transparency" />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
                {success}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {selectedAccount ? "Save changes" : "Create account"}
              </Button>
              {selectedAccount && (
                <Button type="button" variant="outline" onClick={reset}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {accounts.map((account) => (
          <Card key={account.userId} className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>{account.company?.name || account.githubUsername || account.userId}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={account.accountType === "company" ? "secondary" : account.accountType === "admin" ? "default" : "outline"}>
                    {account.accountType}
                  </Badge>
                  {account.archivedAt ? <Badge variant="destructive">Archived</Badge> : <Badge variant="outline">Active</Badge>}
                </div>
              </CardTitle>
              <CardDescription>
                {account.company?.contactEmail || account.company?.websiteUrl || account.githubUsername || account.userId}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {account.company?.industry ? <Badge variant="outline">{account.company.industry}</Badge> : null}
              {account.company?.size ? <Badge variant="secondary">{account.company.size}</Badge> : null}
              <Button type="button" variant="outline" size="sm" onClick={() => loadAccount(account)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleArchive(account)} className="gap-2">
                {account.archivedAt ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {account.archivedAt ? "Restore" : "Archive"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}