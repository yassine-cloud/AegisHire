"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api.client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react";

type SkillImportance = "high" | "medium" | "low";
type CurrentLevel = "none" | "beginner" | "intermediate";

type ParsedJob = {
  title: string;
  companyName: string;
  location?: string | null;
  employmentType?: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears?: number | null;
  seniority?: string | null;
  summary: string;
};

type SkillMatch = {
  skill: string;
  importance: SkillImportance;
  confidence?: number;
};

type ComparisonResult = {
  compatibility_score: number;
  matched_skills: SkillMatch[];
  missing_skills: SkillMatch[];
};

type Explanation = {
  strengths: string[];
  weaknesses: string[];
  summary: string;
};

type GapEntry = {
  skill: string;
  importance: SkillImportance;
  current_level: CurrentLevel;
  recommendation: string;
  estimated_effort: string;
};

type GapReport = {
  gaps: GapEntry[];
  overall_priority_order: string[];
};

type WorkflowStep = "idle" | "parsing" | "matching" | "explaining" | "reporting" | "done";

const STEP_LABEL: Record<WorkflowStep, string> = {
  idle: "Ready",
  parsing: "Extracting job structure",
  matching: "Comparing skills",
  explaining: "Writing match explanation",
  reporting: "Building gap report",
  done: "Complete",
};

const STEP_PROGRESS: Record<WorkflowStep, number> = {
  idle: 0,
  parsing: 25,
  matching: 55,
  explaining: 75,
  reporting: 90,
  done: 100,
};

const importanceClasses: Record<SkillImportance, string> = {
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

const levelLabels: Record<CurrentLevel, string> = {
  none: "No exposure",
  beginner: "Beginner",
  intermediate: "Intermediate",
};

async function readJsonOrThrow<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : fallback;
    throw new Error(message);
  }

  return data as T;
}

function listOrEmpty(value: string[] | undefined | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function ExternalJobPage() {
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [step, setStep] = useState<WorkflowStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [parsedJob, setParsedJob] = useState<ParsedJob | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);

  const isBusy = step !== "idle" && step !== "done";
  const formError = useMemo(() => {
    if (companyName.trim().length > 0 && companyName.trim().length < 2) {
      return "Company name must be at least 2 characters.";
    }
    if (jobDescription.trim().length > 0 && jobDescription.trim().length < 80) {
      return "Job description must be at least 80 characters.";
    }
    return null;
  }, [companyName, jobDescription]);

  const canSubmit =
    companyName.trim().length >= 2 &&
    jobDescription.trim().length >= 80 &&
    !isBusy;

  const resetResults = () => {
    setParsedJob(null);
    setComparison(null);
    setExplanation(null);
    setGapReport(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    resetResults();

    try {
      setStep("parsing");
      const parseResponse = await apiFetchClient("/external-jobs/parse", {
        method: "POST",
        body: JSON.stringify({
          companyName: companyName.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });
      const parsed = await readJsonOrThrow<ParsedJob>(
        parseResponse,
        "Could not parse the job description.",
      );
      setParsedJob(parsed);

      setStep("matching");
      const compareResponse = await apiFetchClient("/external-jobs/compare", {
        method: "POST",
        body: JSON.stringify({ job: parsed }),
      });
      const match = await readJsonOrThrow<ComparisonResult>(
        compareResponse,
        "Could not compare your profile against this job.",
      );
      setComparison(match);

      const roleTitle = parsed.title || "External role";

      setStep("explaining");
      const explainResponse = await apiFetchClient("/external-jobs/explain", {
        method: "POST",
        body: JSON.stringify({
          roleTitle,
          compatibilityScore: match.compatibility_score,
          matchedSkills: match.matched_skills,
          missingSkills: match.missing_skills,
        }),
      });
      setExplanation(
        await readJsonOrThrow<Explanation>(
          explainResponse,
          "Could not generate the match explanation.",
        ),
      );

      setStep("reporting");
      const reportResponse = await apiFetchClient("/external-jobs/gap-report", {
        method: "POST",
        body: JSON.stringify({
          roleTitle,
          missingSkills: match.missing_skills,
        }),
      });
      setGapReport(
        await readJsonOrThrow<GapReport>(
          reportResponse,
          "Could not generate the gap report.",
        ),
      );

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "External job workflow failed.");
      setStep("idle");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Button asChild variant="ghost" className="gap-2 px-0 hover:bg-transparent hover:underline">
        <Link href="/jobs">
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <Badge variant="outline" className="w-fit gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              External job
            </Badge>
            <CardTitle className="text-3xl">Match a pasted job description</CardTitle>
            <CardDescription>
              Paste a role from another job board and AegisHire will extract its structure,
              compare it with your profile, and produce a gap report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Acme"
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job description</Label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the full job post here..."
                  disabled={isBusy}
                  className="min-h-72 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{jobDescription.trim().length} characters</span>
                  {formError ? <span className="text-destructive">{formError}</span> : null}
                </div>
              </div>

              <Button type="submit" disabled={!canSubmit} className="w-full gap-2">
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                {isBusy ? STEP_LABEL[step] : "Analyze external job"}
              </Button>

              {(isBusy || step === "done") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{STEP_LABEL[step]}</span>
                    <span>{STEP_PROGRESS[step]}%</span>
                  </div>
                  <Progress value={STEP_PROGRESS[step]} />
                </div>
              )}

              {error && (
                <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ParsedJobPreview job={parsedJob} />
          <MatchSummary comparison={comparison} explanation={explanation} />
          <GapReportPanel gapReport={gapReport} />
        </div>
      </div>
    </div>
  );
}

function ParsedJobPreview({ job }: { job: ParsedJob | null }) {
  if (!job) {
    return (
      <Card className="border-dashed border-border/70 bg-card/70">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Parsed job details will appear here.
        </CardContent>
      </Card>
    );
  }

  const responsibilities = listOrEmpty(job.responsibilities);
  const requirements = listOrEmpty(job.requirements);

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{job.title || "External role"}</CardTitle>
            <CardDescription>{job.companyName}</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Parsed
          </Badge>
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
          {job.seniority ? <Badge variant="outline">{job.seniority}</Badge> : null}
          {job.experienceYears !== null && job.experienceYears !== undefined ? (
            <Badge variant="outline">{job.experienceYears}+ years</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {job.summary ? <p className="text-sm leading-6 text-muted-foreground">{job.summary}</p> : null}

        <SkillBadges title="Required skills" skills={job.requiredSkills} importance="high" />
        <SkillBadges title="Preferred skills" skills={job.preferredSkills} importance="medium" />

        {requirements.length > 0 ? <TextList title="Requirements" items={requirements} /> : null}
        {responsibilities.length > 0 ? <TextList title="Responsibilities" items={responsibilities} /> : null}
      </CardContent>
    </Card>
  );
}

function MatchSummary({
  comparison,
  explanation,
}: {
  comparison: ComparisonResult | null;
  explanation: Explanation | null;
}) {
  if (!comparison) return null;

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Compatibility
        </CardTitle>
        <CardDescription>Your profile compared with the parsed role requirements.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Score" value={`${comparison.compatibility_score}%`} />
          <Metric label="Matched" value={String(comparison.matched_skills.length)} />
          <Metric label="Missing" value={String(comparison.missing_skills.length)} />
        </div>
        <Progress value={comparison.compatibility_score} className="h-2" />

        <SkillMatchList title="Matched skills" skills={comparison.matched_skills} empty="No matched skills found yet." />
        <SkillMatchList title="Missing skills" skills={comparison.missing_skills} empty="No missing skills found." />

        {explanation ? (
          <div className="space-y-4 rounded-md border border-border/70 p-4">
            <p className="text-sm leading-6 text-muted-foreground">{explanation.summary}</p>
            <TextList title="Strengths" items={explanation.strengths} />
            <TextList title="Weaknesses" items={explanation.weaknesses} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating explanation...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GapReportPanel({ gapReport }: { gapReport: GapReport | null }) {
  if (!gapReport) return null;

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5 text-muted-foreground" />
          Gap report
        </CardTitle>
        <CardDescription>Recommended priorities for closing the strongest gaps.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {gapReport.overall_priority_order.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {gapReport.overall_priority_order.map((skill, index) => (
              <Badge key={`${skill}-${index}`} variant="secondary" className="gap-1.5">
                {index + 1}. {skill}
              </Badge>
            ))}
          </div>
        ) : null}

        {gapReport.gaps.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            No skill gaps were returned for this role.
          </div>
        ) : (
          <div className="space-y-3">
            {gapReport.gaps.map((gap) => (
              <div key={gap.skill} className="rounded-md border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{gap.skill}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{gap.recommendation}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={importanceClasses[gap.importance]} variant="outline">
                      {gap.importance}
                    </Badge>
                    <Badge variant="outline">{levelLabels[gap.current_level]}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Estimated effort: {gap.estimated_effort}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillBadges({
  title,
  skills,
  importance,
}: {
  title: string;
  skills: string[];
  importance: SkillImportance;
}) {
  const cleanSkills = listOrEmpty(skills);
  if (cleanSkills.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {cleanSkills.map((skill) => (
          <Badge key={skill} className={importanceClasses[importance]} variant="outline">
            {skill}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SkillMatchList({
  title,
  skills,
  empty,
}: {
  title: string;
  skills: SkillMatch[];
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge
              key={`${title}-${skill.skill}`}
              className={importanceClasses[skill.importance]}
              variant="outline"
            >
              {skill.skill}
              {typeof skill.confidence === "number" ? ` ${Math.round(skill.confidence * 100)}%` : ""}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  const cleanItems = listOrEmpty(items);
  if (cleanItems.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {cleanItems.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="leading-6">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
