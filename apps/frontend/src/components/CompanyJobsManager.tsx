"use client";

import { useMemo, useState } from "react";
import { apiFetchClient } from "@/lib/api.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Pencil, Archive, RotateCcw, XCircle } from "lucide-react";

interface JobRecord {
  id: string;
  title: string;
  location?: string | null;
  employmentType?: string | null;
  description: string;
  responsibilities?: string[] | null;
  requirements?: string[] | null;
  salaryRange?: string | null;
  status: string;
  archivedAt?: string | null;
  createdAt: string;
}

interface CompanyJobsManagerProps {
  initialJobs: JobRecord[];
}

const EMPTY_JOB = {
  title: "",
  location: "",
  employmentType: "full-time",
  description: "",
  responsibilities: "",
  requirements: "",
  salaryRange: "",
  status: "published",
};

export default function CompanyJobsManager({ initialJobs }: CompanyJobsManagerProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_JOB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const reset = () => {
    setSelectedJobId(null);
    setForm(EMPTY_JOB);
  };

  const loadJob = (job: JobRecord) => {
    setSelectedJobId(job.id);
    setForm({
      title: job.title,
      location: job.location || "",
      employmentType: job.employmentType || "full-time",
      description: job.description,
      responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.join(", ") : "",
      requirements: Array.isArray(job.requirements) ? job.requirements.join(", ") : "",
      salaryRange: job.salaryRange || "",
      status: job.status,
    });
    setError(null);
    setSuccess(null);
  };

  const mapJob = (payload: any): JobRecord => ({
    id: payload.id,
    title: payload.title,
    location: payload.location,
    employmentType: payload.employmentType,
    description: payload.description,
    responsibilities: payload.responsibilities,
    requirements: payload.requirements,
    salaryRange: payload.salaryRange,
    status: payload.status,
    archivedAt: payload.archivedAt,
    createdAt: payload.createdAt,
  });

  const saveJob = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const body = JSON.stringify({
        title: form.title,
        location: form.location || undefined,
        employmentType: form.employmentType || undefined,
        description: form.description,
        responsibilities: form.responsibilities
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        requirements: form.requirements
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        salaryRange: form.salaryRange || undefined,
        status: form.status,
      });

      const response = await apiFetchClient(
        selectedJob ? `/companies/me/jobs/${selectedJob.id}` : "/companies/me/jobs",
        {
          method: selectedJob ? "PATCH" : "POST",
          body,
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save job.");
      }

      const saved = mapJob(await response.json());
      setJobs((current) => {
        const withoutSaved = current.filter((job) => job.id !== saved.id);
        return [saved, ...withoutSaved].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      });
      setSuccess(selectedJob ? "Job updated." : "Job posted.");
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const archiveJob = async (job: JobRecord) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetchClient(`/companies/me/jobs/${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !job.archivedAt }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to archive job.");
      }

      const saved = mapJob(await response.json());
      setJobs((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setSuccess(job.archivedAt ? "Job restored." : "Job archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{selectedJob ? "Edit job post" : "Post a job"}</CardTitle>
          <CardDescription>Publish openings and keep them updated from the company portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={saveJob}>
            <div className="space-y-2">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Senior Frontend Engineer" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} placeholder="Remote" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment type</Label>
                <Input id="employmentType" value={form.employmentType} onChange={(e) => setForm((current) => ({ ...current, employmentType: e.target.value }))} placeholder="full-time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryRange">Salary range</Label>
              <Input id="salaryRange" value={form.salaryRange} onChange={(e) => setForm((current) => ({ ...current, salaryRange: e.target.value }))} placeholder="$90k - $130k" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                rows={5}
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Explain the role, mission, and responsibilities."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <Input id="responsibilities" value={form.responsibilities} onChange={(e) => setForm((current) => ({ ...current, responsibilities: e.target.value }))} placeholder="Build UI, ship features, mentor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Input id="requirements" value={form.requirements} onChange={(e) => setForm((current) => ({ ...current, requirements: e.target.value }))} placeholder="React, TypeScript, Next.js" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
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

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {selectedJob ? "Save changes" : "Post job"}
              </Button>
              {selectedJob && (
                <Button type="button" variant="outline" onClick={reset}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {jobs.map((job) => (
          <Card key={job.id} className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>{job.title}</span>
                <Badge variant={job.archivedAt ? "destructive" : "default"}>{job.archivedAt ? "Archived" : job.status}</Badge>
              </CardTitle>
              <CardDescription>{job.location || job.employmentType || job.salaryRange || "Job opening"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => loadJob(job)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => archiveJob(job)} className="gap-2">
                {job.archivedAt ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {job.archivedAt ? "Restore" : "Archive"}
              </Button>
            </CardContent>
          </Card>
        ))}

        {jobs.length === 0 && (
          <Card className="border-dashed border-border/70">
            <CardContent className="py-8 text-sm text-muted-foreground">
              No jobs posted yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}