import { apiFetchServer } from "@/lib/api.server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BriefcaseBusiness, Building2, CalendarDays, MapPin, Search } from "lucide-react";

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
            <Card key={job.id} className="border-border/70 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl leading-tight">
                      <Link href={`/jobs/${job.id}`} className="hover:underline underline-offset-4">
                        {job.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" />
                      {job.company.name}
                    </CardDescription>
                  </div>
                  {job.salaryRange ? <Badge variant="secondary">{job.salaryRange}</Badge> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {job.location ? (
                    <Badge variant="outline" className="gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </Badge>
                  ) : null}
                  {job.employmentType ? (
                    <Badge variant="outline" className="gap-1.5">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      {job.employmentType}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(job.createdAt)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-4 text-sm text-muted-foreground">{job.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {job.company.industry ? <Badge variant="secondary">{job.company.industry}</Badge> : null}
                  {job.company.size ? <Badge variant="secondary">{job.company.size}</Badge> : null}
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-primary hover:underline">
                  View job details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}