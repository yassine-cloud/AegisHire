'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Select, SelectItem } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Copy, Check } from 'lucide-react';

interface GenerateLetterFormProps {
  onSuccess?: (response: GeneratedContent) => void;
  jobId?: string;
  jobInfo?: {
    title?: string;
    description?: string;
    company?: string;
    industry?: string;
  };
  userInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedIn?: string;
    background?: string;
  };
}

interface GeneratedContent {
  email?: string;
  motivationLetter?: string;
}

export function GenerateLetterForm({ onSuccess, jobId, jobInfo, userInfo }: GenerateLetterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state with pre-filled data
  const [formData, setFormData] = useState({
    userName: userInfo?.name || '',
    userEmail: userInfo?.email || '',
    userPhone: userInfo?.phone || '',
    userLinkedIn: userInfo?.linkedIn || '',
    userBackground: userInfo?.background || '',
    jobTitle: jobInfo?.title || '',
    jobDescription: jobInfo?.description || '',
    companyName: jobInfo?.company || '',
    companyIndustry: jobInfo?.industry || '',
    draftContent: '',
    applicationType: 'both' as 'email' | 'motivation-letter' | 'both',
    tone: 'professional' as 'formal' | 'professional' | 'friendly',
  });

  // Generated content state
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (
        !formData.userName ||
        !formData.userEmail ||
        !formData.jobTitle ||
        !formData.jobDescription ||
        !formData.companyName ||
        !formData.draftContent
      ) {
        throw new Error('Please fill in all required fields');
      }

      const response = await fetch('/api/ai-generation/generate-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate content');
      }

      const data = await response.json();
      setGeneratedContent(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle>AI Application Letter Generator</CardTitle>
          <CardDescription>
            Provide your information and job details, and GROQ AI will generate professional emails
            and motivation letters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* User Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.userName}
                    onChange={(e) => handleInputChange('userName', e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => handleInputChange('userEmail', e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    value={formData.userPhone}
                    onChange={(e) => handleInputChange('userPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">LinkedIn Profile</label>
                  <Input
                    value={formData.userLinkedIn}
                    onChange={(e) => handleInputChange('userLinkedIn', e.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Background/Summary</label>
                <Textarea
                  value={formData.userBackground}
                  onChange={(e) => handleInputChange('userBackground', e.target.value)}
                  placeholder="Brief overview of your experience, skills, and career goals..."
                  className="h-24"
                />
              </div>
            </div>

            {/* Job Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Job Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="Senior Software Engineer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Company Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Industry</label>
                  <Input
                    value={formData.companyIndustry}
                    onChange={(e) => handleInputChange('companyIndustry', e.target.value)}
                    placeholder="e.g., Technology, Finance"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.jobDescription}
                  onChange={(e) => handleInputChange('jobDescription', e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="h-32"
                  required
                />
              </div>
            </div>

            {/* Your Draft Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Draft</h3>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Draft Content <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.draftContent}
                  onChange={(e) => handleInputChange('draftContent', e.target.value)}
                  placeholder="Write your initial draft, notes, or key points you want to highlight..."
                  className="h-32"
                  required
                />
              </div>
            </div>

            {/* Options Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Generation Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">What to Generate</label>
                  <Select
                    value={formData.applicationType}
                    onChange={(e) =>
                      handleInputChange('applicationType', e.target.value)
                    }
                  >
                    <SelectItem value="email">Email Only</SelectItem>
                    <SelectItem value="motivation-letter">Motivation Letter Only</SelectItem>
                    <SelectItem value="both">Both Email & Letter</SelectItem>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <Select value={formData.tone} onChange={(e) => handleInputChange('tone', e.target.value)}>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </Select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Application Letters'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Generated Content Display */}
      {generatedContent && (
        <div className="space-y-4">
          {generatedContent.email && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Email</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.email || '', 'email')}
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
                  {generatedContent.email}
                </div>
              </CardContent>
            </Card>
          )}

          {generatedContent.motivationLetter && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Motivation Letter</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(generatedContent.motivationLetter || '', 'letter')
                    }
                  >
                    {copiedField === 'letter' ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
                  {generatedContent.motivationLetter}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => {
              setGeneratedContent(null);
              setFormData({
                userName: '',
                userEmail: '',
                userPhone: '',
                userLinkedIn: '',
                userBackground: '',
                jobTitle: '',
                jobDescription: '',
                companyName: '',
                companyIndustry: '',
                draftContent: '',
                applicationType: 'both',
                tone: 'professional',
              });
            }}
            variant="outline"
            className="w-full"
          >
            Generate New
          </Button>
        </div>
      )}
    </div>
  );
}
