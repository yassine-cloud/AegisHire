"use client";

import { useState } from "react";
import { GripVertical, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Candidate, ApplicationStatus } from "./types";
import { STATUS_META } from "./types";

const COLUMNS: ApplicationStatus[] = ["PENDING", "REVIEW", "ACCEPTED", "REJECTED"];

interface CandidatePipelineBoardProps {
  candidates: Candidate[];
  onStageChange: (candidateId: string, newStatus: ApplicationStatus) => void;
  onCardClick: (candidate: Candidate) => void;
}

export default function CandidatePipelineBoard({
  candidates,
  onStageChange,
  onCardClick,
}: CandidatePipelineBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);

  const byStatus = (status: ApplicationStatus) =>
    candidates.filter((c) => c.status === status);

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData("text/plain", candidateId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(candidateId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: ApplicationStatus) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData("text/plain");
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate && candidate.status !== newStatus) {
      onStageChange(candidateId, newStatus);
    }
    setDraggedId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((status) => {
        const meta = STATUS_META[status];
        const cards = byStatus(status);
        const isOver = dragOverColumn === status;

        return (
          <div
            key={status}
            className={`flex flex-col rounded-xl border transition-colors ${meta.color} ${isOver ? "ring-2 ring-primary/40" : ""}`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <span className="text-sm font-medium text-white">
                  {meta.label}
                </span>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-zinc-300">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 p-2">
              {cards.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isDragging={draggedId === candidate.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={onCardClick}
                />
              ))}

              {cards.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 py-8">
                  <p className="text-xs text-zinc-600">Drop here</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CandidateCard({
  candidate,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  candidate: Candidate;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onClick: (c: Candidate) => void;
}) {
  const scoreColor =
    candidate.matchScore >= 80
      ? "text-emerald-400"
      : candidate.matchScore >= 60
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, candidate.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(candidate)}
      className={`group cursor-pointer rounded-lg border border-white/10 bg-zinc-900/80 p-3 shadow-sm transition-all hover:border-white/20 hover:bg-zinc-900 ${isDragging ? "opacity-40 ring-2 ring-primary/50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {candidate.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-400">
            {candidate.jobTitle}
          </p>
        </div>
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {candidate.skills.slice(0, 2).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="h-4 px-1.5 text-[10px]"
            >
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 2 && (
            <span className="text-[10px] text-zinc-500">
              +{candidate.skills.length - 2}
            </span>
          )}
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-medium ${scoreColor}`}
        >
          <Star className="h-3 w-3" />
          {candidate.matchScore}%
        </span>
      </div>
    </div>
  );
}
