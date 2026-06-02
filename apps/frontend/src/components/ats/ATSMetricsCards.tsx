"use client";

import { Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Candidate } from "./types";

interface ATSMetricsCardsProps {
  candidates: Candidate[];
}

export default function ATSMetricsCards({ candidates }: ATSMetricsCardsProps) {
  const total = candidates.length;
  const pending = candidates.filter((c) => c.status === "PENDING").length;
  const accepted = candidates.filter((c) => c.status === "ACCEPTED").length;
  const rejected = candidates.filter((c) => c.status === "REJECTED").length;

  const metrics = [
    {
      label: "Total Applications",
      value: total,
      icon: Users,
      iconClass: "text-zinc-400",
      valueClass: "text-white",
    },
    {
      label: "Pending Review",
      value: pending,
      icon: Clock,
      iconClass: "text-zinc-400",
      valueClass: "text-zinc-200",
    },
    {
      label: "Accepted",
      value: accepted,
      icon: CheckCircle2,
      iconClass: "text-emerald-400",
      valueClass: "text-emerald-400",
    },
    {
      label: "Rejected",
      value: rejected,
      icon: XCircle,
      iconClass: "text-red-400",
      valueClass: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label} className="border-border/70 bg-card/80">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-lg bg-zinc-800 p-2.5">
              <m.icon className={`h-5 w-5 ${m.iconClass}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={`mt-0.5 text-2xl font-semibold ${m.valueClass}`}>
                {m.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
