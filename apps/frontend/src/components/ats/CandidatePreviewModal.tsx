"use client";

import { X, Star, Briefcase, CalendarDays, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Candidate } from "./types";
import { STATUS_META } from "./types";

interface CandidatePreviewModalProps {
  candidate: Candidate | null;
  onClose: () => void;
}

export default function CandidatePreviewModal({
  candidate,
  onClose,
}: CandidatePreviewModalProps) {
  if (!candidate) return null;

  const meta = STATUS_META[candidate.status];
  const scoreColor =
    candidate.matchScore >= 80
      ? "text-emerald-400"
      : candidate.matchScore >= 60
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">
              {candidate.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span>{candidate.jobTitle}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5 max-h-[70vh] overflow-y-auto">
          {/* Status + match score row */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${meta.color}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span
              className={`flex items-center gap-1.5 text-sm font-semibold ${scoreColor}`}
            >
              <Star className="h-3.5 w-3.5" />
              {candidate.matchScore}% match
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Applied {candidate.appliedAt}
            </span>
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Resume summary */}
          {candidate.resumeSummary && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Resume Summary
              </p>
              <p className="text-sm leading-6 text-zinc-300">
                {candidate.resumeSummary}
              </p>
            </div>
          )}

          {/* Generated Email */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              Generated Email
            </p>
            {candidate.generatedEmail ? (
              <div className="text-sm leading-6 text-zinc-300 whitespace-pre-wrap rounded-md bg-zinc-800/50 p-4">
                {candidate.generatedEmail}
              </div>
            ) : (
              <p className="text-sm italic text-zinc-600">No generated email available</p>
            )}
          </div>

          {/* Motivation letter */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Motivation Letter
            </p>
            {candidate.motivationLetter ? (
              <div className="text-sm leading-6 text-zinc-300 whitespace-pre-wrap rounded-md bg-zinc-800/50 p-4">
                {candidate.motivationLetter}
              </div>
            ) : (
              <p className="text-sm italic text-zinc-600">No motivation letter available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
