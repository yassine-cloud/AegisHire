'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { JobApplyButton } from './JobApplyButton';
import Link from 'next/link';
import { BriefcaseBusiness, Building2, CalendarDays, MapPin } from 'lucide-react';

interface JobCardProps {
  job: {
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
    };
  };
}

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
};

export function JobCard({ job }: JobCardProps) {
  return (
    <Card className="border-border/70 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
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
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <p className="line-clamp-4 text-sm text-muted-foreground">{job.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {job.company.industry ? <Badge variant="secondary">{job.company.industry}</Badge> : null}
          {job.company.size ? <Badge variant="secondary">{job.company.size}</Badge> : null}
        </div>

        <div className="flex gap-2 mt-auto pt-4">
          <Link 
            href={`/jobs/${job.id}`} 
            className="text-sm font-medium text-primary hover:underline flex-1"
          >
            View details
          </Link>
          <JobApplyButton
            jobId={job.id}
            jobTitle={job.title}
            companyName={job.company.name}
            jobDescription={job.description}
            companyIndustry={job.company.industry || undefined}
            size="sm"
            className="flex-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
