'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiFetchClient } from '@/lib/api.client';

interface Application {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  generatedEmail?: string;
  generatedLetter?: string;
  job: {
    title: string;
    description: string;
    company: {
      name: string;
      industry?: string;
    };
  };
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      const response = await apiFetchClient('/job-applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadApplications);
  }, [loadApplications]);

  const handleDelete = async (applicationId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      const response = await apiFetchClient(`/job-applications/${applicationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setApplications(applications.filter((app) => app.id !== applicationId));
      }
    } catch (err) {
      console.error('Error deleting application:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'shortlisted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'viewed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">
          Track all your job applications and their status
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No applications yet</p>
            <Button asChild>
              <Link href="/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{app.job.title}</CardTitle>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">
                      {app.job.company.name}
                      {app.job.company.industry && ` • ${app.job.company.industry}`}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Applied on
                    </p>
                    <p className="font-medium text-sm">
                      {formatDate(app.appliedAt)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {(app.generatedEmail || app.generatedLetter) && (
                <CardContent className="space-y-3 pt-0">
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      GENERATED CONTENT
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {app.generatedEmail && (
                        <Badge variant="outline">Email Generated</Badge>
                      )}
                      {app.generatedLetter && (
                        <Badge variant="outline">Letter Generated</Badge>
                      )}
                    </div>
                  </div>

                  {app.generatedEmail && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium hover:text-primary">
                        View Generated Email
                      </summary>
                      <div className="mt-2 bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {app.generatedEmail}
                      </div>
                    </details>
                  )}

                  {app.generatedLetter && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium hover:text-primary">
                        View Generated Letter
                      </summary>
                      <div className="mt-2 bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {app.generatedLetter}
                      </div>
                    </details>
                  )}
                </CardContent>
              )}

              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/30 flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Link href={`/jobs/${app.jobId}`}>
                    <ExternalLink className="w-4 h-4" />
                    View Job
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(app.id)}
                  className="ml-auto gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
