"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/api.client";
import {
  loadGithubAnalysisResult,
  saveGithubAnalysisResult,
} from "@/lib/github-analysis-cache";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Network, CheckCircle2, AlertCircle } from "lucide-react";

export function GraphSkillBuilder({ candidateId, candidateName, cvData, githubUsername, initialBuiltAt }: { candidateId?: string, candidateName?: string, cvData?: Record<string, any>, githubUsername?: string, initialBuiltAt?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGithubAnalysisData = async () => {
    if (!githubUsername) {
      return {};
    }

    const cachedAnalysis = loadGithubAnalysisResult(githubUsername);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    const analyzeResponse = await apiFetchClient("/github-analysis/trigger", {
      method: "POST",
      body: JSON.stringify({ githubUsername }),
    });

    if (!analyzeResponse.ok) {
      let errorMsg = "Failed to analyze GitHub profile";
      try {
        const data = await analyzeResponse.json();
        if (data.message) errorMsg = data.message;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const analysisResult = await analyzeResponse.json();
    saveGithubAnalysisResult(githubUsername, analysisResult);

    return analysisResult;
  };

  const handleRebuild = async () => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    try {
      const githubAnalysisData = await getGithubAnalysisData();

      const res = await apiFetchClient("/graph-skill/rebuild", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          candidateName: candidateName || "Unknown",
          cvData: cvData || {},
          githubData: githubAnalysisData,
        }),
      });
      
      if (!res.ok) {
        let errorMsg = "Failed to rebuild skill graph";
        try {
            const data = await res.json();
            if (data.message) errorMsg = data.message;
        } catch(e) {}
        throw new Error(errorMsg);
      }
      
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Network className="w-5 h-5"/> Skill Graph Builder</CardTitle>
        <CardDescription>Consolidate your extracted CV and GitHub skills into a coherent skill graph.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-500 text-sm mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> {error}</div>}
        {initialBuiltAt ? (
            <div className="mb-4 text-green-600 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Graph built on {new Date(initialBuiltAt).toLocaleDateString("en-US")}
            </div>
        ) : (
            <div className="mb-4 text-muted-foreground text-sm">Graph not built yet.</div>
        )}
        <Button onClick={handleRebuild} disabled={loading || !candidateId}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialBuiltAt ? "Rebuild Graph" : "Build Graph"}
        </Button>
      </CardContent>
    </Card>
  )
}
