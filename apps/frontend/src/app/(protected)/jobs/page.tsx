import { apiFetchServer } from "@/lib/api.server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { JobCard } from "@/components/JobCard";

export const metadata = {
  title: "Jobs | AegisHire",
};

type JobRecord = {
  id: string;
  title: string;
  location?: string | null;
  employmentType?: string | null;
  description: string;
  salaryRange?: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
    industry?: string | null;
    size?: string | null;
    websiteUrl?: string | null;
    contactEmail?: string | null;
  };
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = (resolvedSearchParams?.q || "").trim().toLowerCase();
  const response = await apiFetchServer("/companies/jobs");
  const jobs: JobRecord[] = response.ok ? await response.json() : [];

  const filteredJobs = query
    ? jobs.filter((job) => {
        const searchable = [job.title, job.location, job.employmentType, job.description, job.company.name, job.company.industry]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      })
    : jobs;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-zinc-950 via-zinc-900 to-slate-950 p-6 sm:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
              Open roles
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Explore jobs available for developers
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 max-w-xl">
              Browse published openings from companies on AegisHire. Search by title, company, location, or keyword to find opportunities that fit your skills.
            </p>
          </div>

          <form className="w-full lg:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                name="q"
                defaultValue={resolvedSearchParams?.q || ""}
                placeholder="Search jobs, companies, or locations"
                className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-zinc-500"
              />
            </div>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} found</span>
        {query ? <span>Filtered by “{resolvedSearchParams?.q}”</span> : <span>Showing latest openings</span>}
      </div>

      {filteredJobs.length === 0 ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No jobs match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}