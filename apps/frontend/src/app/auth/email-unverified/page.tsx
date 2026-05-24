"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function EmailUnverifiedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);
    
    // Attempt to get user from local session (might be partially signed in)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || (!user.email)) {
      setMessage({ type: "error", text: "We couldn't identify your session. Please try logging in again." });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Verification email resent! Check your inbox." });
    }
    setLoading(false);
  };

  const handleCheckStatus = () => {
    // A simple refresh will trigger the layout protections again if the user
    // actually already verified on a different tab, dropping them into /profile
    router.refresh();
    router.push("/profile");
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white relative flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden bg-zinc-950 pointer-events-none">
        <div className="absolute top-[30%] -right-[10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 mb-6">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-white mb-4">
          Email Verification Required
        </h2>
        
        <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 p-6 sm:p-8 shadow-xl">
          <p className="text-zinc-300 mb-6">
            You must verify your email address before you can access this page. Please click the link sent to your email to verify your account.
          </p>

          {message && (
            <div className={`p-4 rounded-xl mb-6 text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleCheckStatus}
              className="w-full bg-white text-zinc-950 hover:bg-zinc-200 h-11"
            >
              I've verified my email
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleResend}
              disabled={loading}
              className="w-full bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white h-11"
            >
              {loading ? "Sending..." : "Resend verification email"}
            </Button>

            <Button 
              variant="ghost" 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth/login");
              }}
              className="w-full mt-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            >
              Sign out and change account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
