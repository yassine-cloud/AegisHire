"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/api.client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, Loader2, Save, Sparkles, XCircle } from "lucide-react";

interface CompanyFormProps {
  initialData: {
    name?: string;
    industry?: string | null;
    size?: string | null;
    values?: string[] | null;
    websiteUrl?: string | null;
    description?: string | null;
    contactEmail?: string | null;
  };
}

export default function CompanyForm({ initialData }: CompanyFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name || "");
  const [industry, setIndustry] = useState(initialData.industry || "");
  const [size, setSize] = useState(initialData.size || "");
  const [values, setValues] = useState((initialData.values || []).join(", "));
  const [websiteUrl, setWebsiteUrl] = useState(initialData.websiteUrl || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [contactEmail, setContactEmail] = useState(initialData.contactEmail || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const normalizedValues = useMemo(
    () =>
      values
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [values]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiFetchClient("/companies/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          industry,
          size,
          values: normalizedValues,
          websiteUrl,
          description,
          contactEmail,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save company information.");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Company name
          </Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Tech" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="size">Company size</Label>
          <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="11-50" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="values">Values</Label>
          <Input
            id="values"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="Ownership, transparency, speed"
          />
          <p className="text-xs text-muted-foreground">Comma-separated values are stored as a structured list.</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="websiteUrl" className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Website URL
          </Label>
          <Input id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://acme.example.com" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="talent@acme.example.com" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Tell candidates what makes your company different."
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        {normalizedValues.length > 0 ? (
          normalizedValues.map((value) => <Badge key={value} variant="outline">{value}</Badge>)
        ) : (
          <Badge variant="secondary">No values defined yet</Badge>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
          <Sparkles className="h-4 w-4 shrink-0" />
          Company information saved successfully.
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save company profile
        </Button>
      </div>
    </form>
  );
}