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
    const text = await response.text();
    const data = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : null;
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

  if (accountType === "developer") {
    // Inject the new shell layout for developers
    return (
      <ProfileDashboardShell
        candidateName={candidateName}
        isNewProfile={isNewProfile}
        profileData={{
          ...profileData,
          userId: user?.id,
        }}
      />
    );
  }

  // Fallback for Company/Admin
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Account settings
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update your display name, change your password, and manage your profile details.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <CompanyAdminProfileForm
          initialData={{
            displayName: user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "",
            email: user?.email ?? "",
          }}
        />
      </div>
    </div>
  );
}