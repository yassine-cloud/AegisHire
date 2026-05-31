import { apiFetchServer } from "@/lib/api.server";
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

  return (
    <ProfileDashboardShell
      candidateName={candidateName}
      isNewProfile={isNewProfile}
      profileData={profileData}
    />
  );
}