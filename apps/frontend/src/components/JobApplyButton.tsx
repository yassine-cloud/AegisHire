'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ApplyJobFlow } from './ApplyJobFlow';
import { useToast } from './ui/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetchClient } from '@/lib/api.client';

interface JobApplyButtonProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  companyIndustry?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function JobApplyButton({
  jobId,
  jobTitle,
  companyName,
  jobDescription,
  companyIndustry,
  size = 'md',
  className,
}: JobApplyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const { toast } = useToast();

  const checkIfApplied = useCallback(async () => {
    try {
      const response = await apiFetchClient(`/job-applications/job/${jobId}/check`);
      if (response.ok) {
        const data = await response.json();
        setHasApplied(data.applied);
      }
    } catch (error) {
      console.error('Error checking application status:', error);
    } finally {
      setIsChecking(false);
    }
  }, [jobId]);

  useEffect(() => {
    void Promise.resolve().then(checkIfApplied);
  }, [checkIfApplied]);

  const handleApplicationSubmitted = () => {
    setHasApplied(true);
    setIsOpen(false);
    toast({
      title: 'Application submitted!',
      description: 'Your application has been sent successfully.',
    });
  };

  if (isChecking) {
    return (
      <Button disabled variant="outline" size={size} className={className}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (hasApplied) {
    return (
      <Button disabled variant="outline" size={size} className={className}>
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Applied
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size={size}
        className={className}
      >
        Apply Now
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for this job</DialogTitle>
            <DialogDescription>
              {jobTitle} at {companyName}
            </DialogDescription>
          </DialogHeader>

          <ApplyJobFlow
            job={{
              id: jobId,
              title: jobTitle,
              description: jobDescription,
              company: {
                name: companyName,
                industry: companyIndustry,
              },
            }}
            onApplicationSubmitted={handleApplicationSubmitted}
            onCancel={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
