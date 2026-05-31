"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Network, RefreshCw } from "lucide-react";
import { apiFetchClient } from "@/lib/api.client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GraphNode = {
  id: string;
  name: string;
  type: "User" | "Skill" | "Company" | "Language" | "ArchitecturePattern" | string;
  commit_consistency_score?: number | null;
};

type GraphEdge = {
  source: string;
  target: string;
  type: string;
  confidence?: number;
  evidence?: string[];
  role?: string;
  percentage?: number;
};

type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type PositionedNode = GraphNode & {
  x: number;
  y: number;
  radius: number;
  fill: string;
  stroke: string;
  label: string;
  confidence?: number | null;
};

type SkillConfidenceRow = {
  id: string;
  name: string;
  confidence: number;
  evidenceCount: number;
  evidence: string[];
};

const GRAPH_WIDTH = 760;
const GRAPH_HEIGHT = 520;
const CENTER_X = GRAPH_WIDTH / 2;
const CENTER_Y = GRAPH_HEIGHT / 2;

const NODE_STYLE: Record<string, { fill: string; stroke: string; radius: number }> = {
  User: { fill: "#f97316", stroke: "#c2410c", radius: 28 },
  Skill: { fill: "#2563eb", stroke: "#1d4ed8", radius: 18 },
  Company: { fill: "#16a34a", stroke: "#15803d", radius: 18 },
  Language: { fill: "#7c3aed", stroke: "#6d28d9", radius: 18 },
  ArchitecturePattern: { fill: "#0f766e", stroke: "#115e59", radius: 18 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampConfidence(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return clamp(value, 0, 1);
}

function createPositions(nodes: GraphNode[], skillConfidenceById: Map<string, number>): PositionedNode[] {
  const userNode = nodes.find((node) => node.type === "User") ?? nodes[0];
  const otherNodes = nodes.filter((node) => node.id !== userNode?.id);

  const groups = {
    Skill: otherNodes.filter((node) => node.type === "Skill"),
    Company: otherNodes.filter((node) => node.type === "Company"),
    Language: otherNodes.filter((node) => node.type === "Language"),
    ArchitecturePattern: otherNodes.filter((node) => node.type === "ArchitecturePattern"),
    Other: otherNodes.filter((node) =>
      !["Skill", "Company", "Language", "ArchitecturePattern"].includes(node.type),
    ),
  };

  const layouts: Array<{ type: keyof typeof groups; startAngle: number; endAngle: number; radius: number }> = [
    { type: "Skill", startAngle: Math.PI, endAngle: Math.PI * 1.65, radius: 190 },
    { type: "Company", startAngle: Math.PI * 0.9, endAngle: Math.PI * 1.25, radius: 220 },
    { type: "Language", startAngle: -Math.PI * 0.1, endAngle: Math.PI * 0.45, radius: 220 },
    { type: "ArchitecturePattern", startAngle: Math.PI * 1.55, endAngle: Math.PI * 1.95, radius: 205 },
    { type: "Other", startAngle: -Math.PI * 0.55, endAngle: -Math.PI * 0.05, radius: 230 },
  ];

  const positioned: PositionedNode[] = [];

  if (userNode) {
    const userStyle = NODE_STYLE.User;
    positioned.push({
      ...userNode,
      x: CENTER_X,
      y: CENTER_Y,
      radius: userStyle.radius,
      fill: userStyle.fill,
      stroke: userStyle.stroke,
      label: userNode.name,
    });
  }

  for (const layout of layouts) {
    const nodesInGroup = groups[layout.type];
    if (!nodesInGroup.length) {
      continue;
    }

    nodesInGroup.forEach((node, index) => {
      const style = NODE_STYLE[node.type] ?? { fill: "#475569", stroke: "#334155", radius: 16 };
      const ratio = nodesInGroup.length === 1 ? 0.5 : index / (nodesInGroup.length - 1);
      const angle = layout.startAngle + (layout.endAngle - layout.startAngle) * ratio;
      const x = CENTER_X + Math.cos(angle) * layout.radius;
      const y = CENTER_Y + Math.sin(angle) * layout.radius;
      const confidence = node.type === "Skill" ? skillConfidenceById.get(node.id) ?? null : null;
      const confidenceScale = confidence == null ? 0 : clampConfidence(confidence);

      positioned.push({
        ...node,
        x: clamp(x, 60, GRAPH_WIDTH - 60),
        y: clamp(y, 60, GRAPH_HEIGHT - 60),
        radius: node.type === "Skill" ? style.radius + Math.round(confidenceScale * 8) : style.radius,
        fill: style.fill,
        stroke: style.stroke,
        label: node.name,
        confidence,
      });
    });
  }

  return positioned;
}

export function SkillGraphVisualization({
  candidateId,
  candidateName,
  initialBuiltAt,
}: {
  candidateId?: string;
  candidateName?: string;
  initialBuiltAt?: string;
}) {
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});

  const fetchGraph = async () => {
    if (!candidateId) {
      setGraph(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetchClient(`/graph-skill/graph/${candidateId}`);

      if (response.status === 404) {
        setGraph(null);
        setError(null);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load skill graph.");
      }

      const data = (await response.json()) as GraphPayload;
      setGraph(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load skill graph.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGraph();
  }, [candidateId]);

  const skillConfidenceById = useMemo(() => {
    const map = new Map<string, number>();

    for (const edge of graph?.edges ?? []) {
      if (edge.type === "PROFICIENT_IN") {
        map.set(edge.target, clampConfidence(edge.confidence));
      }
    }

    return map;
  }, [graph]);

  const positionedNodes = useMemo(
    () =>
      createPositions(graph?.nodes ?? [], skillConfidenceById).map((node) => {
        const offset = nodeOffsets[node.id];

        if (!offset) {
          return node;
        }

        return {
          ...node,
          x: clamp(node.x + offset.x, 60, GRAPH_WIDTH - 60),
          y: clamp(node.y + offset.y, 60, GRAPH_HEIGHT - 60),
        };
      }),
    [graph, skillConfidenceById, nodeOffsets],
  );

  const edges = useMemo(() => {
    const lookup = new Map(positionedNodes.map((node) => [node.id, node]));
    return (graph?.edges ?? [])
      .map((edge) => {
        const source = lookup.get(edge.source);
        const target = lookup.get(edge.target);
        if (!source || !target) {
          return null;
        }
        return { ...edge, sourceNode: source, targetNode: target };
      })
      .filter(Boolean) as Array<GraphEdge & { sourceNode: PositionedNode; targetNode: PositionedNode }>;
  }, [graph, positionedNodes]);

  const skillConfidenceRows = useMemo<SkillConfidenceRow[]>(() => {
    const skillNodes = new Map(
      positionedNodes
        .filter((node) => node.type === "Skill")
        .map((node) => [node.id, node]),
    );

    return (graph?.edges ?? [])
      .filter((edge) => edge.type === "PROFICIENT_IN")
      .map((edge) => {
        const skillNode = skillNodes.get(edge.target);
        const confidence = clampConfidence(edge.confidence);

        return {
          id: edge.target,
          name: skillNode?.name ?? edge.target.replace(/^skill_/, ""),
          confidence,
          evidenceCount: edge.evidence?.length ?? 0,
          evidence: edge.evidence ?? [],
        };
      })
      .sort((left, right) => right.confidence - left.confidence);
  }, [graph, positionedNodes]);

  const stats = useMemo(() => {
    const skills = graph?.nodes.filter((node) => node.type === "Skill").length ?? 0;
    const languages = graph?.nodes.filter((node) => node.type === "Language").length ?? 0;
    const companies = graph?.nodes.filter((node) => node.type === "Company").length ?? 0;
    const architectures = graph?.nodes.filter((node) => node.type === "ArchitecturePattern").length ?? 0;

    return { skills, languages, companies, architectures };
  }, [graph]);

  const handleSvgPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!draggingNodeId) {
      return;
    }

    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = GRAPH_WIDTH / rect.width;
    const scaleY = GRAPH_HEIGHT / rect.height;
    const currentX = (event.clientX - rect.left) * scaleX;
    const currentY = (event.clientY - rect.top) * scaleY;

    const node = createPositions(graph?.nodes ?? [], skillConfidenceById).find((item) => item.id === draggingNodeId);
    if (!node) {
      return;
    }

    setNodeOffsets((previous) => ({
      ...previous,
      [draggingNodeId]: {
        x: currentX - node.x,
        y: currentY - node.y,
      },
    }));
  };

  const stopDragging = () => {
    setDraggingNodeId(null);
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Skill graph visualization
        </CardTitle>
        <CardDescription>
          A knowledge graph built from CV extraction and GitHub analysis for {candidateName || "this candidate"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{graph?.nodes.length ?? 0} nodes</Badge>
          <Badge variant="secondary">{graph?.edges.length ?? 0} edges</Badge>
          <Badge variant="outline">
            {initialBuiltAt ? `Built ${new Date(initialBuiltAt).toLocaleDateString()}` : "Not built yet"}
          </Badge>
          <Button type="button" variant="secondary" size="sm" onClick={fetchGraph} disabled={loading || !candidateId}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh graph
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!candidateId && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Save a profile first to load the skill graph.
          </div>
        )}

        {candidateId && !loading && !error && !graph && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Build the graph from the CV worker and GitHub analysis first, then reload this view to inspect the knowledge graph.
          </div>
        )}

        {graph && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Skills</div>
                <div className="mt-1 text-xl font-semibold">{stats.skills}</div>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Languages</div>
                <div className="mt-1 text-xl font-semibold">{stats.languages}</div>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Companies</div>
                <div className="mt-1 text-xl font-semibold">{stats.companies}</div>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Architecture</div>
                <div className="mt-1 text-xl font-semibold">{stats.architectures}</div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-background">
                <svg
                  viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                  className="h-[520px] w-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06),transparent_35%)]"
                  onPointerMove={handleSvgPointerMove}
                  onPointerUp={stopDragging}
                  onPointerLeave={stopDragging}
                >
                  <defs>
                    <marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                    </marker>
                  </defs>

                  {edges.map((edge) => {
                    const source = edge.sourceNode;
                    const target = edge.targetNode;
                    const stroke =
                      edge.type === "PROFICIENT_IN"
                        ? "#2563eb"
                        : edge.type === "USES_LANGUAGE"
                          ? "#7c3aed"
                          : edge.type === "WORKS_AT"
                            ? "#16a34a"
                            : "#0f766e";
                    const confidence = clampConfidence(edge.confidence);
                    const strokeWidth = edge.type === "PROFICIENT_IN" ? 1.5 + confidence * 4 : edge.type === "USES_LANGUAGE" ? 2.5 : 2;
                    const strokeOpacity = edge.type === "PROFICIENT_IN" ? 0.2 + confidence * 0.6 : 0.45;

                    return (
                      <g key={`${edge.source}-${edge.target}-${edge.type}`}>
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={stroke}
                          strokeOpacity={strokeOpacity}
                          strokeWidth={strokeWidth}
                          markerEnd="url(#graph-arrow)"
                        />
                      </g>
                    );
                  })}

                  {positionedNodes.map((node) => {
                    const confidence = clampConfidence(node.confidence);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          setDraggingNodeId(node.id);
                        }}
                        title={node.type === "Skill" && node.confidence != null ? `${node.label}: ${(confidence * 100).toFixed(0)}% confidence` : node.label}
                        style={{ cursor: draggingNodeId === node.id ? "grabbing" : "grab" }}
                      >
                        <circle
                          r={node.radius}
                          fill={node.fill}
                          fillOpacity={node.type === "Skill" && node.confidence != null ? 0.45 + confidence * 0.5 : 1}
                          stroke={node.stroke}
                          strokeWidth={node.type === "Skill" ? 2.5 : 3}
                        />
                        <text
                          y={node.radius + 16}
                          textAnchor="middle"
                          className="fill-foreground text-[11px] font-medium"
                        >
                          {node.label}
                        </text>
                        <text y="4" textAnchor="middle" className="fill-white text-[10px] font-semibold">
                          {node.type === "User"
                            ? "You"
                            : node.type === "ArchitecturePattern"
                              ? "Arch"
                              : node.type === "Skill"
                                ? node.confidence != null
                                  ? `${Math.round(confidence * 100)}%`
                                  : "Skill"
                                : node.type}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="rounded-3xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-semibold">Skill confidence</h3>
                    <p className="text-xs text-muted-foreground">
                      Final confidence from the merged CV + GitHub graph.
                    </p>
                  </div>
                  <Badge variant="secondary">{skillConfidenceRows.length} skills</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {skillConfidenceRows.length ? (
                    skillConfidenceRows.map((skill) => {
                      const width = `${Math.max(skill.confidence * 100, 8)}%`;

                      return (
                        <div key={skill.id} className="space-y-1.5 rounded-2xl border border-border/70 p-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">{skill.name}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {(skill.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
                              style={{ width }}
                              title={skill.evidence.length ? skill.evidence.join(" • ") : undefined}
                            />
                            <div
                              className="absolute top-[-3px] h-4 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
                              style={{ left: width }}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {skill.evidenceCount > 0
                              ? `${skill.evidenceCount} evidence source${skill.evidenceCount > 1 ? "s" : ""}`
                              : "No evidence attached"}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Build the graph first to see skill confidence weights here.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Blue: CV or direct skill evidence</Badge>
              <Badge variant="outline">Green: Company experience</Badge>
              <Badge variant="outline">Purple: GitHub language signals</Badge>
              <Badge variant="outline">Teal: Architecture patterns</Badge>
              <Badge variant="secondary">Bars: confidence ranking</Badge>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              This graph is driven by the real worker-backed CV extraction and GitHub analysis pipeline. Rebuild the skill graph, then refresh here to inspect the updated candidate knowledge graph.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}