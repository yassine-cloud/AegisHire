import { apiFetchServer } from "@/lib/api.server";
import ProfileForm from "@/components/ProfileForm";
import CompanyAdminProfileForm from "@/components/CompanyAdminProfileForm";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileDashboardShell } from "@/components/ProfileDashboardShell";

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

  const accountType = profileData?.accountType || "developer";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isNewProfile ? "Complete your profile" : "Account settings"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isNewProfile
              ? "Set your display name and keep your profile details up to date."
              : "Update your display name, change your password, and manage your profile details."}
          </p>
        </div>
        {accountType === "developer" && (
        <Link
          href="/test-gap-report"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 transition-colors hover:bg-muted/30 whitespace-nowrap"
        >
          <FlaskConical className="h-4 w-4" />
          Test Gap Report
        </Link>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        {accountType === "developer" ? (
          <ProfileForm
            initialData={{
              displayName: user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "",
              email: user?.email ?? "",
              githubUsername: profileData?.githubUsername,
              resumeFileUrl: profileData?.resumeFileUrl,
              skills: profileData?.skills ?? null,
            }}
            isNew={isNewProfile}
          />
        ) : (
          <CompanyAdminProfileForm
            initialData={{
              displayName: user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "",
              email: user?.email ?? "",
            }}
          />
        )}
      </div>
    </div>
  );
}