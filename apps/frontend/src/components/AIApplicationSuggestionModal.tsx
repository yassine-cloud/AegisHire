'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Sparkles } from 'lucide-react';

interface AIApplicationSuggestionModalProps {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobId: string;
  onAccept: () => void;
  onDecline: () => void;
  isOpen: boolean;
}

export function AIApplicationSuggestionModal({
  jobTitle,
  companyName,
  jobDescription,
  jobId,
  onAccept,
  onDecline,
  isOpen,
}: AIApplicationSuggestionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <CardTitle>AI Application Assistant</CardTitle>
          </div>
          <CardDescription>
            Need help crafting your application?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Our AI can help you write a professional email and motivation letter tailored to this position.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Position Details:</p>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm space-y-1">
              <p>
                <span className="font-medium">Company:</span> {companyName}
              </p>
              <p>
                <span className="font-medium">Position:</span> {jobTitle}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Let GROQ AI generate a compelling email and motivation letter based on your profile and this job description.
          </p>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Get AI Help
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
