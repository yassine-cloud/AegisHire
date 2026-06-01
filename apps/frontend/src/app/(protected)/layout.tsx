import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

async function fetchUserAccountType(token: string | undefined) {
  if (!token) return 'developer';
  
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const profile = await response.json();
      return profile.accountType || 'developer';
    }
  } catch (err) {
    // Silently fail and default to developer
  }
  
  return 'developer';
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  if (!user.email_confirmed_at) {
    redirect("/auth/email-unverified");
  }

  // Fetch account type to determine nav visibility
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const accountType = await fetchUserAccountType(token);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/5 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>
      
      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">AegisHire</span>
          </div>
          
          <nav>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Profile
              </Link>
              {accountType === 'developer' && (
                <Link href="/jobs" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Jobs
                </Link>
              )}
              {(accountType === 'company') && (
                <Link href="/company" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Company
                </Link>
              )}
              {accountType === 'admin' && (
                <Link href="/admin" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Admin
                </Link>
              )}
              <form action="/auth/login" method="GET">
                <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors" formAction={async () => {
                  "use server";
                  const supabase = await createClient();
                  await supabase.auth.signOut();
                  redirect("/auth/login");
                }}>
                  Sign Out
                </button>
              </form>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
