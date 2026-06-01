"use client";

const STORAGE_PREFIX = "aegishire:github-analysis:";

export type GithubAnalysisResult = Record<string, any>;

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getGithubAnalysisCacheKey(username: string) {
  return `${STORAGE_PREFIX}${normalizeUsername(username)}`;
}

export function loadGithubAnalysisResult(username?: string): GithubAnalysisResult | null {
  if (!username || !canUseLocalStorage()) {
    return null;
  }

  try {
    const cached = window.localStorage.getItem(getGithubAnalysisCacheKey(username));
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as { analysis?: GithubAnalysisResult } | GithubAnalysisResult;
    if (parsed && typeof parsed === "object" && "analysis" in parsed && parsed.analysis) {
      return parsed.analysis;
    }

    if (parsed && typeof parsed === "object") {
      return parsed as GithubAnalysisResult;
    }
  } catch {
    return null;
  }

  return null;
}

export function saveGithubAnalysisResult(username: string, analysis: GithubAnalysisResult) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    getGithubAnalysisCacheKey(username),
    JSON.stringify({
      analysis,
      savedAt: new Date().toISOString(),
    }),
  );
}
