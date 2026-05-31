"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/api.client";
import { saveGithubAnalysisResult } from "@/lib/github-analysis-cache";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, GitBranch, CheckCircle2, AlertCircle } from "lucide-react";

export function GithubAnalysisCard({ githubUsername, initialAnalyzedAt }: { githubUsername?: string, initialAnalyzedAt?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!githubUsername) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchClient("/github-analysis/trigger", {
        method: "POST",
        body: JSON.stringify({ githubUsername }),
      });
      
      if (!res.ok) {
        let errorMsg = "Failed to analyze GitHub profile";
        try {
            const data = await res.json();
            if (data.message) errorMsg = data.message;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const analysisResult = await res.json();
      saveGithubAnalysisResult(githubUsername, analysisResult);
      
      router.refresh(); // Refresh page to update initialAnalyzedAt from server
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5"/> GitHub Analysis</CardTitle>
        <CardDescription>Analyze your GitHub repositories to extract your coding skills and patterns.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-500 text-sm mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> {error}</div>}
        {initialAnalyzedAt ? (
            <div className="mb-4 text-green-600 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Analyzed on {new Date(initialAnalyzedAt).toLocaleDateString()}
            </div>
        ) : (
            <div className="mb-4 text-muted-foreground text-sm">Not analyzed yet.</div>
        )}
        <Button onClick={handleAnalyze} disabled={loading || !githubUsername}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialAnalyzedAt ? "Re-analyze GitHub" : "Analyze GitHub"}
        </Button>
        {!githubUsername && <p className="text-xs text-muted-foreground mt-2">Please set and save a GitHub username first.</p>}
      </CardContent>
    </Card>
  )
}
