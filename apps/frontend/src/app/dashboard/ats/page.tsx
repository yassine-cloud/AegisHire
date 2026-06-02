"use client";

import { useState, useCallback } from "react";
import { LayoutDashboard } from "lucide-react";
import ATSMetricsCards from "@/components/ats/ATSMetricsCards";
import CandidatePipelineBoard from "@/components/ats/CandidatePipelineBoard";
import CandidatePreviewModal from "@/components/ats/CandidatePreviewModal";
import type { Candidate, ApplicationStatus } from "@/components/ats/types";
import { MOCK_CANDIDATES } from "@/components/ats/types";

export default function ATSDashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const handleStageChange = useCallback(
    (candidateId: string, newStatus: ApplicationStatus) => {
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
      );
    },
    []
  );

  const handleCardClick = useCallback((candidate: Candidate) => {
    setSelectedCandidate(candidate);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedCandidate(null);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[5%] top-[10%] h-[40%] w-[40%] rounded-full bg-violet-600/5 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[5%] h-[45%] w-[45%] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-blue-600">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              ATS Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Manage and track applicant pipeline
            </p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="mb-6">
          <ATSMetricsCards candidates={candidates} />
        </div>

        {/* Kanban board */}
        <CandidatePipelineBoard
          candidates={candidates}
          onStageChange={handleStageChange}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Candidate preview modal */}
      <CandidatePreviewModal
        candidate={selectedCandidate}
        onClose={handleModalClose}
      />
    </div>
  );
}
