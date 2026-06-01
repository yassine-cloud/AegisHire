"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  Mail,
  Lock,
  UserRound,
} from "lucide-react";

type ParsedSkills = Record<string, string[]>;

interface ProfileFormProps {
  initialData: {
    displayName?: string;
    email?: string;
    githubUsername?: string;
    resumeFileUrl?: string;
    skills?: ParsedSkills | null;
  };
  isNew: boolean;
}

export default function ProfileForm({ initialData, isNew }: ProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(
    initialData.displayName || ""
  );
  const [email] = useState(initialData.email || "");
  const [githubUsername, setGithubUsername] = useState(
    initialData.githubUsername || ""
  );
  const [resumeFileUrl, setResumeFileUrl] = useState(
    initialData.resumeFileUrl || ""
  );
  const [skills, setSkills] = useState<ParsedSkills | null>(
    initialData.skills || null
  );

  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Account settings state
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);

  // Developer details state
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSuccess, setDetailsSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsingMode, setParsingMode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const totalSkillCount = skills
    ? Object.values(skills).flat().length
    : 0;

  const normalizedSkillsEntries = skills
    ? Object.entries(skills).filter(([, categorySkills]) => Array.isArray(categorySkills))
    : [];

  const normalizedInitialSkillEntries = initialData.skills
    ? Object.entries(initialData.skills).filter(([, categorySkills]) => Array.isArray(categorySkills))
    : [];

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

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountLoading(true);
    setAccountError(null);
    setAccountSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setAccountError("The new password confirmation does not match.");
      setAccountLoading(false);
      return;
    }

    try {
      const trimmedDisplayName = displayName.trim();
      if (!trimmedDisplayName && !newPassword) {
        // Nothing to update
        setAccountSuccess(true);
        return;
      }

      const updatePayload: Record<string, any> = {};
      if (newPassword) updatePayload.password = newPassword;
      if (trimmedDisplayName) updatePayload.data = { display_name: trimmedDisplayName, full_name: trimmedDisplayName };

      const { error } = await supabase.auth.updateUser(updatePayload);
      if (error) throw new Error(error.message);

      setAccountSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err: any) {
      setAccountError(err.message || "Failed to update account settings.");
    } finally {
      setAccountLoading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsSuccess(false);

    try {
      const payload: Record<string, any> = { githubUsername, resumeFileUrl };
      if (skills) payload.skills = skills;

      const response = await apiFetchClient("/profile/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update profile details.");
      }

      setDetailsSuccess(true);
      router.refresh();
    } catch (err: any) {
      setDetailsError(err.message || "An unexpected error occurred while saving details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account settings form */}
      <form className="space-y-6" onSubmit={handleAccountSubmit}>
        {accountError && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <XCircle className="h-4 w-4 shrink-0" />
            {accountError}
          </div>
        )}
        {accountSuccess && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Account settings saved successfully!
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Account settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your display name or password. Your email stays read-only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              Display name
            </Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your public name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
              className="bg-muted/40 text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email changes are disabled here. Contact support if you need to change your login email.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                New password
              </Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={accountLoading} className="w-full sm:w-auto">
            {accountLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isNew ? (
              "Create Account"
            ) : (
              "Save Account"
            )}
          </Button>
        </div>
      </form>

      <Separator />

      {/* Developer details form */}
      <form className="space-y-6" onSubmit={handleDetailsSubmit}>
        {detailsError && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <XCircle className="h-4 w-4 shrink-0" />
            {detailsError}
          </div>
        )}
        {detailsSuccess && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Profile details saved successfully!
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

        </Button>

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
      {normalizedSkillsEntries.map(([category, categorySkills]) => (
        <div key={category}>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            {category}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(categorySkills as string[]).map((skill) => (
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
      {normalizedInitialSkillEntries.map(([category, categorySkills]) => (
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

        <div className="flex justify-end">
          <Button type="submit" disabled={detailsLoading} className="w-full sm:w-auto">
            {detailsLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isNew ? (
              "Create Profile"
            ) : (
              "Save Details"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
