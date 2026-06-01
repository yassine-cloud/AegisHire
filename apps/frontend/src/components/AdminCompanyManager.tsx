"use client";

import { useState } from "react";
import { apiFetchClient } from "@/lib/api.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Shield, XCircle } from "lucide-react";

interface CompanySummary {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  createdAt: string;
}

interface AdminCompanyManagerProps {
  initialCompanies: CompanySummary[];
}

export default function AdminCompanyManager({ initialCompanies }: AdminCompanyManagerProps) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetchClient("/companies/admin", {
        method: "POST",
        body: JSON.stringify({
          email,
          password: password || undefined,
          name,
          industry,
          size,
          contactEmail,
          websiteUrl,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to create company credentials.");
      }

      const created = await response.json();
      setCompanies((current) => [
        {
          id: created.company.id,
          name: created.company.name,
          industry: created.company.industry,
          size: created.company.size,
          contactEmail: created.company.contactEmail,
          websiteUrl: created.company.websiteUrl,
          createdAt: created.company.createdAt,
        },
        ...current,
      ]);
      setSuccess(`Created ${created.email}. Share the password securely: ${created.password}`);
      setEmail("");
      setPassword("");
      setName("");
      setIndustry("");
      setSize("");
      setContactEmail("");
      setWebsiteUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Create company credentials</CardTitle>
          <CardDescription>Provision a Supabase user and the linked company record in one step.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Company email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="company.admin@example.com" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to generate one" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Company name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Tech" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="51-200" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="talent@example.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
              </div>
            </div>

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

            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Create company access
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {companies.map((company) => (
          <Card key={company.id} className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>{company.name}</span>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>{company.contactEmail || company.websiteUrl || "Provisioned company account"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {company.industry ? <Badge variant="outline">{company.industry}</Badge> : null}
              {company.size ? <Badge variant="secondary">{company.size}</Badge> : null}
            </CardContent>
          </Card>
        ))}

        {companies.length === 0 ? (
          <Card className="border-dashed border-border/70">
            <CardContent className="py-8 text-sm text-muted-foreground">
              No companies have been provisioned yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}