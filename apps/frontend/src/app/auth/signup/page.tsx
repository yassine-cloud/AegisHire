"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setError("An account with this email already exists.");
      setLoading(false);
      return;
    }
    
    // Automatically successful sign up, now prompt verification
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen bg-zinc-950 text-white relative flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden bg-zinc-950 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px]" />
        </div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Check your email</h2>
          <p className="text-zinc-400">
            We've sent a verification link to <span className="text-white font-medium">{email}</span>.
            Please verify your email to continue.
          </p>
          <Button 
            className="mt-4 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white" 
            variant="outline" 
            onClick={() => router.push("/auth/login")}
          >
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white relative flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden bg-zinc-950 pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -bottom-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white mb-2">
          Create an account
        </h2>
        <p className="text-center text-sm text-zinc-400">
          Join us and get started today
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSignup}>
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-zinc-300">Email address</Label>
              <div className="mt-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-violet-500"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="mt-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-violet-500"
                  placeholder="Create a strong password"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-zinc-950 hover:bg-zinc-200 h-11 transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                {loading ? "Creating account..." : "Sign up"}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-400">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
