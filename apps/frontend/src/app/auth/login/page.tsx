"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError("Login failed. Please verify your email.");
      setLoading(false);
      return;
    }

    // Explicitly call router.refresh to sync Next.js server context with the new cookies.
    router.refresh();
    router.push("/profile");
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white relative flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background gradients and blobs */}
      <div className="absolute inset-0 overflow-hidden bg-zinc-950 pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-white mb-2">
          Welcome back
        </h2>
        <p className="text-center text-sm text-zinc-400">
          Sign in to your account to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-violet-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-400">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-violet-400 hover:text-violet-300">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-zinc-950 hover:bg-zinc-200 h-11 transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-400">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
