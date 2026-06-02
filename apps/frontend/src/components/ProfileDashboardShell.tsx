"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Network,
  Settings,
  UploadCloud,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileForm from "@/components/ProfileForm";
import { GithubAnalysisCard } from "@/components/GithubAnalysisCard";
import { GraphSkillBuilder } from "@/components/GraphSkillBuilder";
import { SkillGraphVisualization } from "@/components/SkillGraphVisualization";

type ProfileData = {
  githubUsername?: string;
  resumeFileUrl?: string;
  skills?: Record<string, string[]> | null;
  githubAnalyzedAt?: string;
  graphBuiltAt?: string;
  userId?: string;
};

type SectionId = "dashboard" | "github" | "graph" | "knowledge" | "settings";

const navigation: Array<{
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "github",
    label: "GitHub analysis",
    icon: GitBranch,
  },
  {
    id: "graph",
    label: "Skill graph",
    icon: Network,
  },
  {
    id: "knowledge",
    label: "Knowledge graph",
    icon: Network,
  },
  {
    id: "settings",
    label: "Profile settings",
    icon: Settings,
  },
];

export function ProfileDashboardShell({
  candidateName,
  isNewProfile,
  profileData,
}: {
  candidateName: string;
  isNewProfile: boolean;
  profileData: ProfileData | null;
}) {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const hasProfile = Boolean(profileData && !isNewProfile);

  const heading =
    activeSection === "dashboard"
      ? isNewProfile
        ? "Complete your profile"
        : "Dashboard"
      : navigation.find((item) => item.id === activeSection)?.label ?? "Dashboard";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="overflow-hidden rounded-[28px] border border-zinc-800/80 bg-zinc-950 text-zinc-50 shadow-2xl shadow-black/40">
        <div className="grid min-h-[calc(100vh-2rem)] lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-zinc-800/80 bg-zinc-950 lg:border-b-0 lg:border-r lg:border-zinc-800/80 lg:sticky lg:top-0 lg:h-screen lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:self-start">
            <div className="flex h-full flex-col p-5">
              <div className="flex items-center gap-3 border-b border-zinc-800/70 pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg shadow-violet-500/20">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-zinc-50">AegisHire</p>
                  <p className="text-xs text-zinc-400">Candidate dashboard</p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Navigation</p>
                  <nav className="space-y-2">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-zinc-800/80 text-zinc-50"
                              : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? "text-violet-300" : "text-zinc-400"}`} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                    <Link
                      href="/test-gap-report"
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
                    >
                      <FlaskConical className="h-4 w-4 text-zinc-400" />
                      <span className="truncate">Test Gap Report</span>
                    </Link>
                  </nav>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Status</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                      <div className="text-xs text-zinc-500">CV worker</div>
                      <div className="mt-1 text-sm font-medium text-zinc-50">Connected</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                      <div className="text-xs text-zinc-500">Graph view</div>
                      <div className="mt-1 text-sm font-medium text-zinc-50">Enabled</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-3 pt-5">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-xs leading-5 text-zinc-400">
                  The sidebar gives quick access to each part of the candidate workflow without leaving the dashboard.
                </div>
              </div>
            </div>
          </aside>

          <main className="bg-zinc-900/70 p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <ChevronLeft className="h-4 w-4" />
                  Home
                  <span className="text-zinc-600">/</span>
                  Dashboard
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                  {heading}
                </h1>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Profile active
              </div>
            </div>

            {activeSection === "dashboard" && (
              <div className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-zinc-800 bg-zinc-950/70 text-zinc-50 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <UploadCloud className="h-4 w-4" />
                        CV extraction
                      </CardTitle>
                      <CardDescription>Jump to the worker-backed CV skill extractor.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <button
                        type="button"
                        onClick={() => setActiveSection("settings")}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Go to CV worker form
                      </button>
                    </CardContent>
                  </Card>

                  <Card className="border-zinc-800 bg-zinc-950/70 text-zinc-50 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <GitBranch className="h-4 w-4" />
                        GitHub analysis
                      </CardTitle>
                      <CardDescription>Run the GitHub extraction and analysis pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <button
                        type="button"
                        onClick={() => setActiveSection("github")}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Open GitHub analysis
                      </button>
                    </CardContent>
                  </Card>
                </div>

                <section id="profile-settings" className="scroll-mt-24 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Profile settings and CV extraction</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Update your GitHub username, resume URL, and upload a CV to extract skills with the worker.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-none sm:p-8">
                    <ProfileForm
                      initialData={{
                        githubUsername: profileData?.githubUsername,
                        resumeFileUrl: profileData?.resumeFileUrl,
                        skills: profileData?.skills ?? null,
                      }}
                      isNew={isNewProfile}
                    />
                  </div>
                </section>

                {isNewProfile && (
                  <Card className="border-dashed border-zinc-800 bg-zinc-950/70 text-zinc-50 shadow-none">
                    <CardContent className="p-6 text-sm text-zinc-400">
                      Save your profile first to unlock GitHub analysis and the skill graph builder.
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeSection === "github" && hasProfile && profileData && (
              <section id="github-analysis" className="scroll-mt-24 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-50">GitHub analysis</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Trigger the analysis job using the saved GitHub username.
                  </p>
                </div>
                <GithubAnalysisCard
                  githubUsername={profileData.githubUsername}
                  initialAnalyzedAt={profileData.githubAnalyzedAt}
                />
              </section>
            )}

            {activeSection === "graph" && hasProfile && profileData && (
              <section id="graph-builder" className="scroll-mt-24 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Skill graph builder</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Rebuild the graph from the CV worker and GitHub analysis data.
                  </p>
                </div>
                <GraphSkillBuilder
                  candidateId={profileData.userId}
                  candidateName={candidateName}
                  cvData={{ skills: profileData.skills ?? {} }}
                  githubUsername={profileData.githubUsername}
                  initialBuiltAt={profileData.graphBuiltAt}
                />
              </section>
            )}

            {activeSection === "knowledge" && hasProfile && profileData && (
              <section id="graph-visualization" className="scroll-mt-24 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Knowledge graph</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Visualize the merged skill graph produced from CV extraction and GitHub signals.
                  </p>
                </div>
                <SkillGraphVisualization
                  candidateId={profileData.userId}
                  candidateName={candidateName}
                  initialBuiltAt={profileData.graphBuiltAt}
                />
              </section>
            )}

            {activeSection === "settings" && (
              <section id="profile-settings" className="scroll-mt-24 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Profile settings and CV extraction</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Update your GitHub username, resume URL, and upload a CV to extract skills with the worker.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-none sm:p-8">
                  <ProfileForm
                    initialData={{
                      githubUsername: profileData?.githubUsername,
                      resumeFileUrl: profileData?.resumeFileUrl,
                      skills: profileData?.skills ?? null,
                    }}
                    isNew={isNewProfile}
                  />
                </div>
              </section>
            )}

            {!hasProfile && activeSection !== "settings" && (
              <Card className="border-dashed border-zinc-800 bg-zinc-950/70 text-zinc-50 shadow-none">
                <CardContent className="p-6 text-sm text-zinc-400">
                  Save your profile first to unlock GitHub analysis, the skill graph builder, and the knowledge graph.
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
