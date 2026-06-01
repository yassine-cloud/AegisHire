'use client';

import { useState } from 'react';
import { GenerateLetterForm } from './GenerateLetterForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { apiFetchClient } from '@/lib/api.client';

interface ApplyJobFlowProps {
  job: {
    id: string;
    title: string;
    description: string;
    company: {
      name: string;
      industry?: string;
    };
  };
  userInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedIn?: string;
    background?: string;
  };
  onApplicationSubmitted?: (applicationId: string) => void;
  onCancel?: () => void;
}

export function ApplyJobFlow({
  job,
  userInfo,
  onApplicationSubmitted,
  onCancel,
}: ApplyJobFlowProps) {
  const [step, setStep] = useState<'apply' | 'generate'>('apply');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSkipAI = async () => {
    setIsSubmitting(true);
    try {
      // Create application without AI-generated content
      const response = await apiFetchClient('/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (response.ok) {
        const application = await response.json();
        onApplicationSubmitted?.(application.id);
      }
    } catch (error) {
      console.error('Error creating application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerationComplete = async (content: {
    email?: string;
    motivationLetter?: string;
  }) => {
    setIsSubmitting(true);
    try {
      // Create application with AI-generated content
      const response = await apiFetchClient('/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          generatedEmail: content.email,
          generatedLetter: content.motivationLetter,
        }),
      });

      if (response.ok) {
        const application = await response.json();
        onApplicationSubmitted?.(application.id);
      }
    } catch (error) {
      console.error('Error creating application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'generate') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('apply')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <GenerateLetterForm
          jobId={job.id}
          jobInfo={{
            title: job.title,
            description: job.description,
            company: job.company.name,
            industry: job.company.industry,
          }}
          userInfo={userInfo}
          onSuccess={handleGenerationComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Apply to {job.title}</CardTitle>
          <CardDescription>{job.company.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Would you like help writing your application?
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <p className="text-sm">
              Our AI can generate a professional email and motivation letter tailored to this job.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSkipAI}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Skip AI, Apply Now'
              )}
            </Button>
            <Button
              onClick={() => setStep('generate')}
              className="flex-1"
            >
              Get AI Help
            </Button>
          </div>
        </CardContent>
      </Card>

      {onCancel && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
