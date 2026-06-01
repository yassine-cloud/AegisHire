import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetchServer } from "@/lib/api.server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, CalendarDays, Globe, Mail, MapPin, BriefcaseBusiness } from "lucide-react";

export const metadata = {
  title: "Job details | AegisHire",
};

type JobDetail = {
  id: string;
  title: string;
  location?: string | null;
  employmentType?: string | null;
  description: string;
  responsibilities?: string[] | null;
  requirements?: string[] | null;
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

const toList = (value?: string[] | null) => (Array.isArray(value) ? value.filter(Boolean) : []);

export default async function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const response = await apiFetchServer(`/companies/jobs/${jobId}`);

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Failed to load job details.");
  }

  const job: JobDetail = await response.json();
  const responsibilities = toList(job.responsibilities);
  const requirements = toList(job.requirements);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" className="gap-2 px-0 hover:bg-transparent hover:underline">
          <Link href="/jobs">
            <ArrowLeft className="h-4 w-4" />
            Back to jobs
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Badge variant="outline" className="w-fit">
                  Open role
                </Badge>
                <CardTitle className="text-3xl sm:text-4xl">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {job.company.name}
                </CardDescription>
              </div>
              {job.salaryRange ? <Badge variant="secondary" className="text-sm">{job.salaryRange}</Badge> : null}
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
                Posted {formatDate(job.createdAt)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">About the role</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{job.description}</p>
            </section>

            {responsibilities.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Responsibilities</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {responsibilities.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {requirements.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Requirements</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {requirements.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Company</CardTitle>
              <CardDescription>Learn more about the team behind this opening.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">{job.company.name}</p>
                {job.company.industry ? <p className="text-muted-foreground">{job.company.industry}</p> : null}
                {job.company.size ? <p className="text-muted-foreground">{job.company.size}</p> : null}
              </div>

              <div className="space-y-3">
                {job.company.websiteUrl ? (
                  <a href={job.company.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Globe className="h-4 w-4" />
                    Visit website
                  </a>
                ) : null}
                {job.company.contactEmail ? (
                  <a href={`mailto:${job.company.contactEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-4 w-4" />
                    Contact email
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Apply</CardTitle>
              <CardDescription>Use the company contact details to follow up on this opening.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This page is ready for future application flow integration.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}