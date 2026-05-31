"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/api.client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Network, CheckCircle2, AlertCircle } from "lucide-react";

export function GraphSkillBuilder({ candidateId, candidateName, cvData, githubUsername, initialBuiltAt }: { candidateId?: string, candidateName?: string, cvData?: Record<string, any>, githubUsername?: string, initialBuiltAt?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRebuild = async () => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchClient("/graph-skill/rebuild", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          candidateName: candidateName || "Unknown",
          cvData: cvData || {},
          githubData: githubUsername ? { github_username: githubUsername } : {},
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
