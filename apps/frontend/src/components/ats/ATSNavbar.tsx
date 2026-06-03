"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetchClient } from "@/lib/api.client";
import { createClient } from "@/lib/supabase/client";

export default function ATSNavbar() {
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    apiFetchClient("/profile/me")
      .then((res) => (res.ok ? (res.json() as Promise<{ accountType: string }>) : Promise.resolve(null)))
      .then((data) => setAccountType(data?.accountType ?? null))
      .catch(() => setAccountType(null));
  }, []);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }, []);

  return (
    <header className="relative z-10 w-full border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-blue-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AegisHire</span>
        </div>
        <nav>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
              Profile
            </Link>
            {accountType === "company" && (
              <Link href="/company" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                Company
              </Link>
            )}
            <Link href="/dashboard/ats" className="text-sm font-medium text-white transition-colors">
              ATS Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
