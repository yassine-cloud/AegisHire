import Link from "next/link";
import { FlaskConical, GitBranch, LayoutDashboard, Network, UploadCloud } from "lucide-react";
import { apiFetchServer } from "@/lib/api.server";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import { GithubAnalysisCard } from "@/components/GithubAnalysisCard";
import { GraphSkillBuilder } from "@/components/GraphSkillBuilder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Profile | AegisHire",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const candidateName = user?.user_metadata?.full_name || user?.email || "";

  const response = await apiFetchServer("/profile/me");

  let profileData: any = null;
  let isNewProfile = true;

  if (response.ok) {
    const data = await response.json();
    if (data && Object.keys(data).length > 0) {
      profileData = data;
      isNewProfile = false;
    }
  } else if (response.status === 404) {
    isNewProfile = true;
  } else {
    console.error("Failed to fetch profile", response.status);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Candidate dashboard
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {isNewProfile ? "Complete your profile" : "Your candidate dashboard"}
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            {isNewProfile
              ? "Start with CV extraction, then connect GitHub and build your skill graph from real worker-backed flows."
              : "Use the section links below to jump between profile settings, CV extraction, GitHub analysis, and the skill graph builder."}
          </p>
        </div>

        <Link
          href="/test-gap-report"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        >
          <FlaskConical className="h-4 w-4" />
          Test Gap Report
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="h-4 w-4" />
              CV extraction
            </CardTitle>
            <CardDescription>Jump to the worker-backed CV skill extractor.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="#profile-settings" className="text-sm font-medium text-primary hover:underline">
              Go to CV worker form
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4 w-4" />
              GitHub analysis
            </CardTitle>
            <CardDescription>Run the GitHub extraction and analysis pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="#github-analysis" className="text-sm font-medium text-primary hover:underline">
              Open GitHub analysis
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4" />
              Skill graph
            </CardTitle>
            <CardDescription>Consolidate CV and GitHub data into one graph.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="#graph-builder" className="text-sm font-medium text-primary hover:underline">
              Open graph builder
            </Link>
          </CardContent>
        </Card>
      </div>

      <section id="profile-settings" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profile settings and CV extraction</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your GitHub username, resume URL, and upload a CV to extract skills with the worker.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
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

      {!isNewProfile && profileData && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section id="github-analysis" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">GitHub analysis</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Trigger the analysis job using the saved GitHub username.
              </p>
            </div>
            <GithubAnalysisCard
              githubUsername={profileData.githubUsername}
              initialAnalyzedAt={profileData.githubAnalyzedAt}
            />
          </section>

          <section id="graph-builder" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Skill graph builder</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Combine the extracted CV skills and GitHub data into the graph-backed candidate profile.
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
        </div>
      )}

      {isNewProfile && (
        <Card className="border-dashed border-border bg-muted/20">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Save your profile first to unlock GitHub analysis and the skill graph builder.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
