"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/api.client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  GitBranch,
  LinkIcon,
  Tags,
  X,
} from "lucide-react";

type ParsedSkills = Record<string, string[]>;

interface ProfileFormProps {
  initialData: {
    githubUsername?: string;
    resumeFileUrl?: string;
    skills?: ParsedSkills | null;
  };
  isNew: boolean;
}

export default function ProfileForm({ initialData, isNew }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [githubUsername, setGithubUsername] = useState(
    initialData.githubUsername || ""
  );
  const [resumeFileUrl, setResumeFileUrl] = useState(
    initialData.resumeFileUrl || ""
  );
  const [skills, setSkills] = useState<ParsedSkills | null>(
    initialData.skills || null
  );

  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsingMode, setParsingMode] = useState<string | null>(null);

  const totalSkillCount = skills
    ? Object.values(skills).flat().length
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParseError(null);
    }
  };

  const handleParseCV = async () => {
    if (!selectedFile) return;

    setParsing(true);
    setParseError(null);

    const workerUrl =
      process.env.NEXT_PUBLIC_WORKER_URL || "http://127.0.0.1:8000";

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${workerUrl}/parse-cv`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Worker responded with status ${res.status}`
        );
      }

      const data = await res.json();
      if (data.cv?.skills && typeof data.cv.skills === "object") {
        setSkills(data.cv.skills as ParsedSkills);
        setParsingMode(data.parsing_mode);
      } else {
        setParseError("No skills could be extracted from this CV.");
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to reach the CV parser worker.");
    } finally {
      setParsing(false);
    }
  };

  const removeSkill = (category: string, skill: string) => {
    setSkills((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[category] = updated[category].filter((s) => s !== skill);
      if (updated[category].length === 0) delete updated[category];
      return Object.keys(updated).length > 0 ? updated : null;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: Record<string, any> = { githubUsername, resumeFileUrl };
      if (skills) payload.skills = skills;

      const response = await apiFetchClient("/profile/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update profile. Please try again.");
      }

      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Profile saved successfully!
        </div>
      )}

      {/* GitHub Username */}
      <div className="space-y-2">
        <Label htmlFor="githubUsername" className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          GitHub Username
        </Label>
        <p className="text-xs text-muted-foreground">
          Connect your GitHub to showcase your repositories.
        </p>
        <Input
          id="githubUsername"
          name="githubUsername"
          type="text"
          value={githubUsername}
          onChange={(e) => setGithubUsername(e.target.value)}
          placeholder="e.g. octocat"
        />
      </div>

      {/* Resume URL */}
      <div className="space-y-2">
        <Label htmlFor="resumeFileUrl" className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          Resume File URL
        </Label>
        <p className="text-xs text-muted-foreground">
          Provide a public link to your current resume.
        </p>
        <Input
          id="resumeFileUrl"
          name="resumeFileUrl"
          type="url"
          value={resumeFileUrl}
          onChange={(e) => setResumeFileUrl(e.target.value)}
          placeholder="https://example.com/resume.pdf"
        />
      </div>

      <Separator />

      {/* CV Upload & Parse Section */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
            CV Skill Extractor
          </Label>
          <p className="text-xs text-muted-foreground">
            Upload your CV (PDF or image) to automatically extract and attach
            your skills to your profile.
          </p>
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click to change file
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                Click to select a PDF or image
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supported: PDF, PNG, JPG, BMP, TIFF, GIF
              </p>
            </div>
          )}
        </div>

        {parseError && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <XCircle className="h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          disabled={!selectedFile || parsing}
          onClick={handleParseCV}
          className="w-full"
        >
          {parsing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Extracting skills...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Extract Skills with AI
            </>
          )}
        </Button>

        {/* Extracted Skills Display */}
        {skills && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tags className="h-4 w-4" />
                Extracted Skills
                {parsingMode && (
                  <Badge variant="secondary" className="ml-auto text-xs font-normal">
                    {parsingMode} parsing
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {totalSkillCount} skill{totalSkillCount !== 1 ? "s" : ""} extracted
                across {Object.keys(skills).length} categories. Remove any that don&apos;t apply.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(skills).map(([category, categorySkills]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categorySkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="gap-1 pr-1 group"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(category, skill)}
                          className="ml-0.5 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Existing skills from profile (if no new extraction done) */}
        {!skills && initialData.skills && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tags className="h-4 w-4" />
                Current Profile Skills
              </CardTitle>
              <CardDescription className="text-xs">
                Skills currently saved to your profile. Upload a new CV to update.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(initialData.skills).map(([category, categorySkills]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(categorySkills as string[]).map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : isNew ? (
            "Create Profile"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
