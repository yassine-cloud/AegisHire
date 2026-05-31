import { apiFetchServer } from "@/lib/api.server";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import { GithubAnalysisCard } from "@/components/GithubAnalysisCard";
import { GraphSkillBuilder } from "@/components/GraphSkillBuilder";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isNewProfile ? "Complete your profile" : "Your Profile"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isNewProfile
              ? "Welcome! Fill in your info and upload your CV to extract skills."
              : "Update your information, or re-upload your CV to refresh your skills."}
          </p>
        </div>
        <Link
          href="/test-gap-report"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 transition-colors hover:bg-muted/30 whitespace-nowrap"
        >
          <FlaskConical className="h-4 w-4" />
          Test Gap Report
        </Link>
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

      {!isNewProfile && profileData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GithubAnalysisCard 
            githubUsername={profileData.githubUsername} 
            initialAnalyzedAt={profileData.githubAnalyzedAt} 
          />
          <GraphSkillBuilder 
            candidateId={profileData.userId} 
            candidateName={candidateName}
            cvData={{ skills: profileData.skills ?? {} }}
            githubUsername={profileData.githubUsername}
            initialBuiltAt={profileData.graphBuiltAt} 
          />
        </div>
      )}
    </div>
  );
}
