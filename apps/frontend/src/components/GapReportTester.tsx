"use client";

import { useState } from "react";
import { apiFetchClient } from "@/lib/api.client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DatabaseZap,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Clock,
  BarChart2,
  ListOrdered,
} from "lucide-react";

type Importance = "high" | "medium" | "low";
type CurrentLevel = "none" | "beginner" | "intermediate";

interface GapEntry {
  skill: string;
  importance: Importance;
  current_level: CurrentLevel;
  recommendation: string;
  estimated_effort: string;
}

interface GapReport {
  role_id: string;
  compatibility_score: number;
  gaps: GapEntry[];
  overall_priority_order: string[];
}

interface SeedResult {
  roleSlug: string;
  roleTitle: string;
  compatibilityScore: number;
  missingSkills: string[];
  message: string;
}

const IMPORTANCE_CONFIG: Record<Importance, { label: string; className: string }> = {
  high: { label: "High", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  medium: { label: "Medium", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  low: { label: "Low", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
};

const LEVEL_CONFIG: Record<CurrentLevel, { label: string; className: string }> = {
  none: { label: "No exposure", className: "bg-red-500/10 text-red-400" },
  beginner: { label: "Beginner", className: "bg-amber-500/10 text-amber-400" },
  intermediate: { label: "Intermediate", className: "bg-blue-500/10 text-blue-400" },
};

export default function GapReportTester() {
  const [roleSlugInput, setRoleSlugInput] = useState("software-engineer");
  const [roleTitleInput, setRoleTitleInput] = useState("Software Engineer");
  const [compatibilityInput, setCompatibilityInput] = useState("40");
  const [missingSkillsInput, setMissingSkillsInput] = useState(
    "TypeScript, Docker, System Design, CI/CD, PostgreSQL"
  );
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [report, setReport] = useState<GapReport | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const parsedSkills = missingSkillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const score = Number.parseInt(compatibilityInput, 10);
      const res = await apiFetchClient("/roles/test-setup", {
        method: "POST",
        body: JSON.stringify({
          roleSlug: roleSlugInput.trim(),
          roleTitle: roleTitleInput.trim(),
          compatibilityScore: Number.isNaN(score) ? 40 : score,
          missingSkills: parsedSkills,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Setup failed with status ${res.status}`);
      }
      const data = await res.json();
      setSeedResult(data);
      setReport(null);
      setReportError(null);
    } catch (err: any) {
      setSeedError(err.message || "Failed to seed test data.");
    } finally {
      setSeeding(false);
    }
  };

  const handleGenerate = async () => {
    if (!seedResult) return;
    setGenerating(true);
    setReportError(null);
    try {
      const res = await apiFetchClient(`/roles/${seedResult.roleSlug}/gap-report`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || `Gap report failed with status ${res.status}`
        );
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setReportError(err.message || "Failed to generate gap report.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1 — Seed data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseZap className="h-5 w-5 text-muted-foreground" />
            Step 1 — Seed Test Data
          </CardTitle>
          <CardDescription>
            Creates or updates a role + role-match record for your user. Configure the role slug,
            title, target compatibility score, and missing skills below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-slug">Role slug</Label>
              <Input
                id="role-slug"
                value={roleSlugInput}
                onChange={(e) => setRoleSlugInput(e.target.value)}
                placeholder="software-engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compatibility">Compatibility score (&lt; 70)</Label>
              <Input
                id="compatibility"
                type="number"
                min={0}
                max={69}
                value={compatibilityInput}
                onChange={(e) => setCompatibilityInput(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-title">Role title</Label>
            <Input
              id="role-title"
              value={roleTitleInput}
              onChange={(e) => setRoleTitleInput(e.target.value)}
              placeholder="Software Engineer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="missing-skills">Missing skills (comma-separated)</Label>
            <Input
              id="missing-skills"
              value={missingSkillsInput}
              onChange={(e) => setMissingSkillsInput(e.target.value)}
              placeholder="TypeScript, Docker, System Design"
            />
          </div>

          {seedError && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              <XCircle className="h-4 w-4 shrink-0" />
              {seedError}
            </div>
          )}
          <Button onClick={handleSeed} disabled={seeding} variant="secondary">
            {seeding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <DatabaseZap className="h-4 w-4 mr-2" />
                Seed Test Role &amp; Match
              </>
            )}
          </Button>

          {seedResult && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                {seedResult.message}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <p className="font-medium">{seedResult.roleTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Compatibility Score</p>
                  <p className="font-medium">{seedResult.compatibilityScore}%</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Missing Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {seedResult.missingSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Generate Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-muted-foreground" />
            Step 2 — Generate Gap Report
          </CardTitle>
          <CardDescription>
            Calls <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /roles/&lt;role-slug&gt;/gap-report</code>.
            The NestJS API will forward this to your Python worker, which calls your configured LLM
            (<code className="text-xs bg-muted px-1 py-0.5 rounded">LLM_PROVIDER</code> in worker .env).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!seedResult && (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground bg-muted/30 border border-border rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Complete Step 1 first to seed the required test data.
            </div>
          )}

          {reportError && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              <XCircle className="h-4 w-4 shrink-0" />
              {reportError}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!seedResult || generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating via LLM...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Gap Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {report && (
        <div className="space-y-4">
          <Separator />
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
            Gap Report Results
          </h2>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-semibold text-sm mt-1">{report.role_id}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Compatibility</p>
                <p className="font-semibold text-sm mt-1">{report.compatibility_score}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Skill Gaps</p>
                <p className="font-semibold text-sm mt-1">{report.gaps.length} gaps found</p>
              </CardContent>
            </Card>
          </div>

          {/* Priority order */}
          {report.overall_priority_order.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Recommended Learning Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {report.overall_priority_order.map((skill, i) => (
                    <li key={skill} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Individual gap cards */}
          <div className="space-y-3">
            {report.gaps.map((gap) => {
              const imp = IMPORTANCE_CONFIG[gap.importance];
              const lvl = LEVEL_CONFIG[gap.current_level];
              return (
                <Card key={gap.skill}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{gap.skill}</CardTitle>
                      <div className="flex gap-1.5 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${imp.className}`}>
                          {imp.label} priority
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lvl.className}`}>
                        Current: {lvl.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {gap.recommendation}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Estimated effort: {gap.estimated_effort}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
