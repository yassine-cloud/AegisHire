'use client';

import { ReactNode } from 'react';
import { JobApplyButton } from '@/components/JobApplyButton';
import { Card, CardContent } from './ui/card';

interface JobDetailsClientProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  companyIndustry?: string;
  children: ReactNode;
}

export function JobDetailsClient({
  jobId,
  jobTitle,
  companyName,
  jobDescription,
  companyIndustry,
  children,
}: JobDetailsClientProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {children}
      
      <Card className="sticky bottom-6 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{jobTitle}</p>
              <p className="text-sm text-muted-foreground">{companyName}</p>
            </div>
            <JobApplyButton
              jobId={jobId}
              jobTitle={jobTitle}
              companyName={companyName}
              jobDescription={jobDescription}
              companyIndustry={companyIndustry}
              size="lg"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
