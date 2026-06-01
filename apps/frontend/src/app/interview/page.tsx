"use client";

import Image from "next/image";
import type { ClipboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Mic,
  MicOff,
  MessageSquareText,
  Play,
  Send,
  ShieldAlert,
  Square,
  StepForward,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type InterviewMode = "text" | "live";

interface InterviewQuestion {
  id: string;
  text: string;
  time_seconds: number;
}

interface ApiErrorBody {
  detail?: string | { message?: string; error?: string };
  message?: string;
}

interface LiveMessage {
  type: "ready" | "audio" | "transcript" | "status" | "stopped" | "error";
  data?: string;
  message?: string;
  model?: string;
  end_reason?: "FINISHED" | "NOT_SERIOUS" | string | null;
  session_id?: string;
  speaker?: string;
  summary?: string | null;
  review?: string | null;
  report_id?: string | null;
  text?: string;
  transcript?: string[];
}

interface SubmitAnswerResponse {
  status: "ok" | "ended" | string;
  question?: InterviewQuestion | null;
  end_reason?: "FINISHED" | "NOT_SERIOUS" | string | null;
  message?: string | null;
  transcript?: string[];
  summary?: string | null;
  review?: string | null;
  report_id?: string | null;
}

interface AssessmentTask {
  id: string;
  type: "find_error" | "design_concept" | "coding";
  title: string;
  prompt: string;
  starter_code?: string | null;
  constraints: string[];
  expected_answer_format: string;
  time_minutes: number;
}

interface AssessmentStartResponse {
  assessment_id: string;
  provider: string;
  model: string;
  tasks: AssessmentTask[];
}

interface AssessmentSubmitResponse {
  status: string;
  report_id?: string | null;
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const DEFAULT_API_BASE = "http://localhost:8000";
const DEFAULT_SKILLS = "React, Next.js, Node.js, NestJS, PostgreSQL, Redis";
const GEMINI_LOGO_SRC = "/gemini-logo.png";
const WRITING_SPEED_LIMIT_CHARS_PER_SECOND = 45;

async function readApiError(response: Response) {
  const fallback = `Request failed with status ${response.status}`;
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.detail === "string") return body.detail;
    if (body.detail?.message) return body.detail.message;
    if (body.detail?.error) return body.detail.error;
    if (body.message) return body.message;
    return fallback;
  } catch {
    return fallback;
  }
}

function parseTranscriptLine(line: string, index: number): TranscriptEntry {
  const match = line.match(/^(Q\[[^\]]+\]|[^:]+):\s*(.*)$/);
  if (!match) {
    return {
      id: `${index}-${line.slice(0, 16)}`,
      speaker: "Note",
      text: line,
    };
  }

  return {
    id: `${index}-${match[1]}`,
    speaker: match[1],
    text: match[2],
  };
}

function appendTranscriptLine(items: string[], line: string) {
  if (!items.length) return [line];

  const previous = parseTranscriptLine(items[items.length - 1], items.length - 1);
  const next = parseTranscriptLine(line, items.length);

  if (
    previous.speaker === next.speaker &&
    !previous.speaker.startsWith("Q[") &&
    previous.speaker !== "Note"
  ) {
    return [
      ...items.slice(0, -1),
      `${previous.speaker}: ${previous.text} ${next.text}`.trim(),
    ];
  }

  return [...items, line];
}

function parseSkillsParam(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated values.
  }
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export default function InterviewPage() {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackTimeRef = useRef(0);
  const aiSpeakingRef = useRef(false);
  const liveMutedRef = useRef(false);
  const typingStatsRef = useRef<Record<string, { lastLength: number; lastAt: number }>>({});

  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [jobTitle, setJobTitle] = useState("Senior Full-Stack Engineer");
  const [jobDescription, setJobDescription] = useState(
    "Build microservices with React, Node.js, NestJS, PostgreSQL, and Redis."
  );
  const [skillsInput, setSkillsInput] = useState(DEFAULT_SKILLS);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [jobOfferId, setJobOfferId] = useState<string | null>(null);
  const [contextLocked, setContextLocked] = useState(false);
  const [mode, setMode] = useState<InterviewMode>("text");
  const [defaultTime] = useState("30");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [interviewReportId, setInterviewReportId] = useState<string | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveMuted, setLiveMuted] = useState(false);
  const [liveModel, setLiveModel] = useState<string | null>(null);
  const [notSeriousNoticeOpen, setNotSeriousNoticeOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [interviewPassed, setInterviewPassed] = useState(false);
  const [assessmentNoticeOpen, setAssessmentNoticeOpen] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [assessmentProvider, setAssessmentProvider] = useState<string | null>(null);
  const [assessmentModel, setAssessmentModel] = useState<string | null>(null);
  const [assessmentReportId, setAssessmentReportId] = useState<string | null>(null);
  const [assessmentTasks, setAssessmentTasks] = useState<AssessmentTask[]>([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentSubmitted, setAssessmentSubmitted] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentWarnings, setAssessmentWarnings] = useState<string[]>([]);
  const [activeAssessmentWarning, setActiveAssessmentWarning] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "start" | "next" | "submit" | "stop" | null
  >(null);

  const skills = useMemo(
    () =>
      skillsInput
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    [skillsInput]
  );

  const transcriptEntries = useMemo(
    () => transcript.map((line, index) => parseTranscriptLine(line, index)),
    [transcript]
  );

  const normalizedApiBase = apiBase.replace(/\/+$/, "");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextApiBase = params.get("workerUrl") || params.get("apiBase");
    const nextJobTitle = params.get("jobTitle");
    const nextJobDescription = params.get("jobDescription");
    const nextSkills = parseSkillsParam(params.get("requiredSkills") || params.get("skills"));
    const nextCandidateId = params.get("candidateId");
    const nextJobOfferId = params.get("jobOfferId") || params.get("roleId");

    if (nextApiBase) setApiBase(nextApiBase);
    if (nextJobTitle) setJobTitle(nextJobTitle);
    if (nextJobDescription) setJobDescription(nextJobDescription);
    if (nextSkills?.length) setSkillsInput(nextSkills.join(", "));
    if (nextCandidateId) setCandidateId(nextCandidateId);
    if (nextJobOfferId) setJobOfferId(nextJobOfferId);
    setContextLocked(Boolean(nextJobTitle || nextJobDescription || nextSkills?.length));

    const splashTimer = window.setTimeout(() => setShowSplash(false), 1800);

    return () => {
      window.clearTimeout(splashTimer);
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      wsRef.current?.close();
      aiSpeakingRef.current = false;
    };
  }, []);

  useEffect(() => {
    liveMutedRef.current = liveMuted;
  }, [liveMuted]);

  useEffect(() => {
    if (!question) {
      setTimer(null);
      return;
    }

    setTimer(question.time_seconds);
    const interval = window.setInterval(() => {
      setTimer((seconds) =>
        typeof seconds === "number" && seconds > 0 ? seconds - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [question]);

  const addAssessmentWarning = useCallback((message: string) => {
    setAssessmentWarnings((items) => [
      ...items,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
    setActiveAssessmentWarning(message);
  }, []);

  useEffect(() => {
    if (!assessmentStarted || assessmentSubmitted) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        addAssessmentWarning("Tab switching was detected during the assessment.");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [addAssessmentWarning, assessmentStarted, assessmentSubmitted]);

  function resetAssessment() {
    typingStatsRef.current = {};
    setAssessmentId(null);
    setAssessmentProvider(null);
    setAssessmentModel(null);
    setAssessmentReportId(null);
    setAssessmentTasks([]);
    setAssessmentAnswers({});
    setAssessmentStarted(false);
    setAssessmentSubmitted(false);
    setAssessmentWarnings([]);
    setActiveAssessmentWarning(null);
  }

  function markInterviewPassed(message = "Interview passed. Problem-solving test unlocked.") {
    setInterviewPassed(true);
    setAssessmentNoticeOpen(true);
    setStatus(message);
  }

  function liveWsUrl() {
    const base = normalizedApiBase || DEFAULT_API_BASE;
    return `${base.replace(/^http/i, "ws")}/interview/live`;
  }

  function getAudioContext() {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }

  function floatTo16BitPcm(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, input[index]));
      output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output;
  }

  function resampleTo16Khz(input: Float32Array, inputRate: number) {
    if (inputRate === 16000) return input;

    const ratio = inputRate / 16000;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let index = 0; index < outputLength; index += 1) {
      const sourceIndex = index * ratio;
      const before = Math.floor(sourceIndex);
      const after = Math.min(before + 1, input.length - 1);
      const weight = sourceIndex - before;
      output[index] = input[before] * (1 - weight) + input[after] * weight;
    }

    return output;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.byteLength; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(value: string) {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  }

  async function startMicStreaming(socket: WebSocket) {
    const context = getAudioContext();
    await context.resume();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      if (
        liveMutedRef.current ||
        aiSpeakingRef.current ||
        socket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      const input = event.inputBuffer.getChannelData(0);
      const resampled = resampleTo16Khz(input, context.sampleRate);
      const pcm = floatTo16BitPcm(resampled);
      socket.send(
        JSON.stringify({
          type: "audio",
          data: arrayBufferToBase64(pcm.buffer),
        })
      );
    };

    source.connect(processor);
    processor.connect(context.destination);

    mediaStreamRef.current = stream;
    sourceRef.current = source;
    processorRef.current = processor;
  }

  function stopMicStreaming() {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current = null;
    sourceRef.current = null;
    mediaStreamRef.current = null;
  }

  function playLiveAudio(base64Audio: string) {
    const context = getAudioContext();
    const pcm = new Int16Array(base64ToArrayBuffer(base64Audio));
    const buffer = context.createBuffer(1, pcm.length, 24000);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < pcm.length; index += 1) {
      channel[index] = pcm[index] / 32768;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    if (playbackTimeRef.current < context.currentTime) {
      playbackTimeRef.current = context.currentTime;
    }

    aiSpeakingRef.current = true;
    source.start(playbackTimeRef.current);
    playbackTimeRef.current += buffer.duration;
    source.onended = () => {
      if (context.currentTime >= playbackTimeRef.current - 0.05) {
        aiSpeakingRef.current = false;
      }
    };
  }

  async function startLiveInterview() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Microphone capture is not available in this browser.");
      return;
    }

    setLoadingAction("start");
    setError(null);
    setVoiceError(null);
    setStatus(null);
    setSummary(null);
    setReview(null);
    setInterviewReportId(null);
    setInterviewPassed(false);
    resetAssessment();
    if (!sessionId) {
      setTranscript([]);
    }
    setQuestion(null);
    setAnswer("");

    const socket = new WebSocket(liveWsUrl());
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "start",
          job_title: jobTitle.trim(),
          job_description: jobDescription.trim(),
          required_skills: skills,
          candidate_id: candidateId,
          job_offer_id: jobOfferId,
          session_id: sessionId,
        })
      );
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as LiveMessage;

      if (message.type === "ready") {
        setLiveConnected(true);
        setLiveModel(message.model || null);
        setSessionId(message.session_id || null);
        if (message.transcript) {
          setTranscript(message.transcript);
        }
        setStatus("Live interview connected");
        setLoadingAction(null);
        playbackTimeRef.current = getAudioContext().currentTime;
        startMicStreaming(socket).catch((err: unknown) => {
          setVoiceError(
            err instanceof Error ? err.message : "Failed to start microphone."
          );
        });
      }

      if (message.type === "audio" && message.data) {
        playLiveAudio(message.data);
      }

      if (message.type === "transcript" && message.text) {
        setTranscript((items) =>
          appendTranscriptLine(
            items,
            `${message.speaker || "Speaker"}: ${message.text}`
          )
        );
      }

      if (message.type === "status" && message.message) {
        setStatus(message.message);
      }

      if (message.type === "stopped") {
        setTranscript(message.transcript || []);
        setSummary(message.summary || null);
        setReview(message.review || null);
        setInterviewReportId(message.report_id || null);
        if (message.end_reason === "NOT_SERIOUS") {
          setReportSubmitted(false);
          setNotSeriousNoticeOpen(true);
        } else if (message.end_reason === "FINISHED") {
          markInterviewPassed();
        }
        setSessionId(null);
        setLiveConnected(false);
        setLiveModel(null);
        setLiveMuted(false);
        setLoadingAction(null);
        if (message.end_reason !== "FINISHED") {
          setStatus("Live interview stopped");
        }
        wsRef.current?.close();
        wsRef.current = null;
      }

      if (message.type === "error") {
        setVoiceError(message.message || "Live interview failed.");
      }
    };

    socket.onerror = () => {
      setVoiceError("Live interview WebSocket failed.");
      setLoadingAction(null);
    };

    socket.onclose = () => {
      stopMicStreaming();
      setLiveConnected(false);
      setLoadingAction(null);
      aiSpeakingRef.current = false;
    };
  }

  function stopLiveInterview() {
    stopMicStreaming();
    setLoadingAction("stop");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      return;
    } else {
      wsRef.current?.close();
    }
    wsRef.current = null;
    setLiveConnected(false);
    setLiveModel(null);
    setLiveMuted(false);
    setSessionId(null);
    setLoadingAction(null);
    aiSpeakingRef.current = false;
  }

  async function startInterview() {
    if (mode === "live") {
      await startLiveInterview();
      return;
    }

    setLoadingAction("start");
    setError(null);
    setVoiceError(null);
    setStatus(null);
    setSummary(null);
    setReview(null);
    setInterviewReportId(null);
    setTranscript([]);
    setQuestion(null);
    setAnswer("");
    setInterviewPassed(false);
    resetAssessment();

    try {
      const res = await fetch(`${normalizedApiBase}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          job_description: jobDescription.trim(),
          required_skills: skills,
          mode,
          candidate_id: candidateId,
          job_offer_id: jobOfferId,
          default_question_time_seconds:
            Number.parseInt(defaultTime, 10) || 30,
        }),
      });

      if (!res.ok) throw new Error(await readApiError(res));

      const data = (await res.json()) as { session_id: string };
      setSessionId(data.session_id);
      setStatus("Session started");
    } catch (err) {
      setSessionId(null);
      setError(err instanceof Error ? err.message : "Failed to start session.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function getNextQuestion() {
    if (!sessionId) return;
    setLoadingAction("next");
    setError(null);
    setVoiceError(null);
    setStatus(null);

    try {
      const res = await fetch(
        `${normalizedApiBase}/interview/${sessionId}/question`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error(await readApiError(res));

      const data = (await res.json()) as { question: InterviewQuestion };
      setQuestion(data.question);
      setAnswer("");
      setStatus("Question loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load question.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function submitAnswer() {
    if (!sessionId || !question) return;
    setLoadingAction("submit");
    setError(null);
    setVoiceError(null);
    setStatus(null);

    try {
      const res = await fetch(
        `${normalizedApiBase}/interview/${sessionId}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: question.id,
            answer_text: answer,
          }),
        }
      );

      if (!res.ok) throw new Error(await readApiError(res));

      const data = (await res.json()) as SubmitAnswerResponse;
      if (data.transcript) {
        setTranscript(data.transcript);
      }
      if (data.summary !== undefined) {
        setSummary(data.summary);
      }
      if (data.review !== undefined) {
        setReview(data.review);
      }
      if (data.report_id !== undefined) {
        setInterviewReportId(data.report_id);
      }

      if (data.end_reason) {
        if (data.end_reason === "NOT_SERIOUS") {
          setReportSubmitted(false);
          setNotSeriousNoticeOpen(true);
        } else if (data.end_reason === "FINISHED") {
          markInterviewPassed();
        }
        setSessionId(null);
        setQuestion(null);
        setAnswer("");
        if (data.end_reason !== "FINISHED") {
          setStatus(data.message || "Interview ended");
        }
        return;
      }

      setQuestion(data.question || null);
      setAnswer("");
      setStatus(data.question ? "Follow-up loaded" : "Answer submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function stopSession() {
    if (mode === "live") {
      stopLiveInterview();
      setStatus("Live interview stopped");
      return;
    }

    if (!sessionId) return;
    setLoadingAction("stop");
    setError(null);
    setVoiceError(null);
    setStatus(null);

    try {
      const res = await fetch(
        `${normalizedApiBase}/interview/${sessionId}/stop`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error(await readApiError(res));

      const data = (await res.json()) as {
        transcript?: string[];
        summary?: string | null;
        review?: string | null;
        report_id?: string | null;
      };
      setTranscript(data.transcript || []);
      setSummary(data.summary || null);
      setReview(data.review || null);
      setInterviewReportId(data.report_id || null);
      setSessionId(null);
      setQuestion(null);
      setAnswer("");
      setStatus("Session stopped");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop session.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function startAssessment() {
    setAssessmentLoading(true);
    setError(null);
    setAssessmentNoticeOpen(false);
    resetAssessment();

    try {
      const res = await fetch(`${normalizedApiBase}/assessment/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          job_description: jobDescription.trim(),
          required_skills: skills,
          interview_transcript: transcript,
          candidate_id: candidateId,
          job_offer_id: jobOfferId,
        }),
      });

      if (!res.ok) throw new Error(await readApiError(res));

      const data = (await res.json()) as AssessmentStartResponse;
      setAssessmentId(data.assessment_id);
      setAssessmentProvider(data.provider);
      setAssessmentModel(data.model);
      setAssessmentReportId(null);
      setAssessmentTasks(data.tasks);
      setAssessmentAnswers(
        Object.fromEntries(data.tasks.map((task) => [task.id, ""]))
      );
      setAssessmentStarted(true);
      setStatus("Problem-solving test started");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start assessment."
      );
      setAssessmentNoticeOpen(true);
    } finally {
      setAssessmentLoading(false);
    }
  }

  function handleAssessmentAnswerChange(taskId: string, value: string) {
    const now = Date.now();
    const previous = typingStatsRef.current[taskId] || {
      lastLength: assessmentAnswers[taskId]?.length || 0,
      lastAt: now,
    };
    const deltaChars = value.length - previous.lastLength;
    const deltaSeconds = Math.max((now - previous.lastAt) / 1000, 0.1);

    if (
      deltaChars > 20 &&
      deltaChars / deltaSeconds > WRITING_SPEED_LIMIT_CHARS_PER_SECOND
    ) {
      addAssessmentWarning(
        "Unusually fast writing was detected. Continue at a natural pace."
      );
    }

    typingStatsRef.current[taskId] = {
      lastLength: value.length,
      lastAt: now,
    };
    setAssessmentAnswers((items) => ({ ...items, [taskId]: value }));
  }

  function handleAssessmentPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    addAssessmentWarning("Pasting is blocked during the assessment.");
  }

  async function submitAssessment() {
    if (!assessmentId || !candidateId || !jobOfferId) {
      addAssessmentWarning("Cannot save the test report without candidate and job offer ids.");
      return;
    }

    setAssessmentLoading(true);
    setError(null);
    try {
      const res = await fetch(`${normalizedApiBase}/assessment/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessmentId,
          candidate_id: candidateId,
          job_offer_id: jobOfferId,
          job_title: jobTitle.trim(),
          tasks: assessmentTasks,
          answers: assessmentAnswers,
          cheating_flags: assessmentWarnings,
        }),
      });

      if (!res.ok) throw new Error(await readApiError(res));

      const data = (await res.json()) as AssessmentSubmitResponse;
      setAssessmentReportId(data.report_id || null);
      setAssessmentSubmitted(true);
      setStatus("Problem-solving test submitted for review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit assessment.");
    } finally {
      setAssessmentLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {showSplash && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black px-6 text-white">
          <div className="flex flex-col items-center gap-5 text-center">
            <Image
              src={GEMINI_LOGO_SRC}
              alt="Gemini"
              width={168}
              height={168}
              priority
              className="h-28 w-auto sm:h-36"
            />
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-white sm:text-base">
              Powered by Gemini
            </p>
          </div>
        </div>
      )}

      {notSeriousNoticeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="not-serious-title"
        >
          <div className="w-full max-w-md rounded-md border bg-background p-5 shadow-lg">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <Ban className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 id="not-serious-title" className="text-lg font-semibold">
                  Interview access restricted
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  The interviewer flagged this session as non-serious. You are banned from continuing this interview attempt.
                </p>
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
              If you think this is a mistake, report it for review. Your chat history and interview transcript will be shared with the investigation team.
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNotSeriousNoticeOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setReportSubmitted(true);
                  setStatus("Report request submitted for investigation");
                }}
                disabled={reportSubmitted}
              >
                <FileText className="h-4 w-4" />
                {reportSubmitted ? "Report Submitted" : "Report Mistake"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {assessmentNoticeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assessment-warning-title"
        >
          <div className="w-full max-w-lg rounded-md border bg-background p-5 shadow-lg">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 id="assessment-warning-title" className="text-lg font-semibold">
                  Problem-solving test rules
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  This test starts after a successful interview. Pasting is blocked, tab switching is logged, and unusually fast writing creates a warning for review.
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
              <p>Complete two error-finding tasks, two design/concept tasks, and one coding task.</p>
              <p>Keep this tab active and write answers naturally in the editor.</p>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssessmentNoticeOpen(false)}
              >
                Not Now
              </Button>
              <Button
                type="button"
                onClick={startAssessment}
                disabled={assessmentLoading}
              >
                {assessmentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeAssessmentWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="assessment-integrity-title"
        >
          <div className="w-full max-w-md rounded-md border bg-background p-5 shadow-lg">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="assessment-integrity-title" className="text-lg font-semibold">
                  Assessment warning
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {activeAssessmentWarning}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setActiveAssessmentWarning(null)}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-muted-foreground" />
              <Badge variant={sessionId ? "default" : "secondary"}>
                {sessionId || liveConnected ? "Active" : "Idle"}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Interviewer Test Console
            </h1>
          </div>

          <div className="flex min-h-9 items-center gap-2 text-sm">
            {loadingAction && (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Working
              </span>
            )}
            {status && !loadingAction && (
              <span className="inline-flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {status}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
          <section className="space-y-5">
            <Card>
              <CardHeader>
                  <CardTitle>Interview Setup</CardTitle>
                <CardDescription>
                  Candidate chooses the mode; job context is supplied by the parent module.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!contextLocked && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="api-base">Worker URL</Label>
                      <Input
                        id="api-base"
                        value={apiBase}
                        onChange={(event) => setApiBase(event.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="job-title">Job title</Label>
                      <Input
                        id="job-title"
                        value={jobTitle}
                        onChange={(event) => setJobTitle(event.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="job-description">Job description</Label>
                      <textarea
                        id="job-description"
                        value={jobDescription}
                        onChange={(event) => setJobDescription(event.target.value)}
                        className="min-h-28 w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="skills">Required skills</Label>
                      <Input
                        id="skills"
                        value={skillsInput}
                        onChange={(event) => setSkillsInput(event.target.value)}
                      />
                    </div>
                  </>
                )}

                {contextLocked && (
                  <div className="space-y-3 rounded-md border bg-background p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Job offer</p>
                      <p className="mt-1 font-medium">{jobTitle}</p>
                    </div>
                    <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                      {jobDescription}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!candidateId || !jobOfferId ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                    Missing candidate id or job offer id. Reports will not be saved until the parent module passes both values.
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mode">Mode</Label>
                    <select
                      id="mode"
                      value={mode}
                      onChange={(event) =>
                        setMode(event.target.value as InterviewMode)
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="text">Text</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={startInterview}
                    disabled={loadingAction !== null || liveConnected}
                  >
                    {loadingAction === "start" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start
                  </Button>
                  <Button
                    onClick={stopSession}
                    disabled={
                      loadingAction !== null ||
                      (mode === "text" ? !sessionId : !liveConnected)
                    }
                    variant="secondary"
                  >
                    {loadingAction === "stop" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Stop
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Session ID</p>
                  <p className="mt-1 break-all font-mono text-xs">
                    {sessionId || (liveConnected ? "Gemini Live session" : "No active session")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Answers</p>
                    <p className="mt-1 font-medium">{transcript.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Timer</p>
                    <p className="mt-1 font-medium">
                      {mode === "live"
                        ? liveConnected
                          ? "Live"
                          : "-"
                        : typeof timer === "number"
                          ? `${timer}s`
                          : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Problem Test</CardTitle>
                <CardDescription>
                  Unlocked after the interview ends successfully.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="mt-1 font-medium">
                      {assessmentSubmitted
                        ? "Submitted"
                        : assessmentStarted
                          ? "In progress"
                          : interviewPassed
                            ? "Unlocked"
                            : "Locked"}
                    </p>
                  </div>
                  <Badge variant={interviewPassed ? "default" : "secondary"}>
                    {assessmentTasks.length}/5 tasks
                  </Badge>
                </div>
                {assessmentId && (
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {assessmentId}
                  </p>
                )}
                {assessmentReportId && (
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    Report: {assessmentReportId}
                  </p>
                )}
                <Button
                  type="button"
                  className="w-full"
                  variant={assessmentStarted ? "outline" : "default"}
                  disabled={!interviewPassed || assessmentLoading || assessmentStarted}
                  onClick={() => setAssessmentNoticeOpen(true)}
                >
                  {assessmentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  {assessmentStarted ? "Test Started" : "Start Problem Test"}
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-5">
            {mode === "live" && (
              <Card>
                <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Gemini Live Voice</CardTitle>
                    <CardDescription>
                      Streams microphone audio to the worker and plays Gemini Live audio responses.
                    </CardDescription>
                  </div>
                  <Badge variant={liveConnected ? "default" : "secondary"}>
                    {liveConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={loadingAction !== null || liveConnected}
                      onClick={startLiveInterview}
                    >
                      {loadingAction === "start" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Connect Live API
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!liveConnected}
                      onClick={() => setLiveMuted((value) => !value)}
                    >
                      {liveMuted ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      {liveMuted ? "Unmute Mic" : "Mute Mic"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!liveConnected}
                      onClick={stopLiveInterview}
                    >
                      <Square className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The mic is gated while the interviewer speaks to avoid the model hearing its own audio.
                    {liveModel ? ` Model: ${liveModel}.` : ""}
                  </p>
                  {voiceError && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{voiceError}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === "text" && (
            <Card>
              <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Question Runner</CardTitle>
                  <CardDescription>
                    POST /interview/{sessionId || ":session_id"}/question
                  </CardDescription>
                </div>
                <Button
                  onClick={getNextQuestion}
                  disabled={!sessionId || loadingAction !== null}
                  variant="outline"
                >
                  {loadingAction === "next" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <StepForward className="h-4 w-4" />
                  )}
                  Next
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {question ? (
                  <>
                    <div className="rounded-md border bg-background p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{question.id}</Badge>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          {timer ?? question.time_seconds}s
                        </span>
                      </div>
                      <p className="text-base leading-7">{question.text}</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="answer">Answer</Label>
                      <textarea
                        id="answer"
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        className="min-h-36 w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>

                    <Button
                      onClick={submitAnswer}
                      disabled={loadingAction !== null}
                    >
                      {loadingAction === "submit" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit Answer
                    </Button>
                  </>
                ) : (
                  <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed bg-background text-sm text-muted-foreground">
                    No question loaded
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {assessmentStarted && (
              <Card>
                <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Problem-Solving Test</CardTitle>
                    <CardDescription>
                      {assessmentProvider || "provider"} / {assessmentModel || "model"}
                    </CardDescription>
                  </div>
                  <Badge variant={assessmentSubmitted ? "secondary" : "default"}>
                    {assessmentSubmitted ? "Submitted" : "Active"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-5">
                  {assessmentWarnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                      <div className="mb-1 font-medium">
                        Integrity warnings: {assessmentWarnings.length}
                      </div>
                      <div className="max-h-24 space-y-1 overflow-y-auto">
                        {assessmentWarnings.map((warning, index) => (
                          <p key={`${warning}-${index}`}>{warning}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {assessmentTasks.map((task, index) => (
                    <article
                      key={task.id}
                      className="rounded-md border bg-background p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Task {index + 1}</Badge>
                        <Badge variant="secondary">
                          {task.type.replace("_", " ")}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          {task.time_minutes}m
                        </span>
                      </div>
                      <h3 className="mb-2 text-base font-semibold">
                        {task.title}
                      </h3>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {task.prompt}
                      </p>
                      {task.starter_code && (
                        <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs leading-5">
                          {task.starter_code}
                        </pre>
                      )}
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {task.constraints.map((constraint) => (
                          <p key={constraint}>- {constraint}</p>
                        ))}
                        <p>Answer format: {task.expected_answer_format}</p>
                      </div>
                      <textarea
                        value={assessmentAnswers[task.id] || ""}
                        onChange={(event) =>
                          handleAssessmentAnswerChange(
                            task.id,
                            event.target.value
                          )
                        }
                        onPaste={handleAssessmentPaste}
                        disabled={assessmentSubmitted}
                        className="mt-3 min-h-40 w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-2 font-mono text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="Write your answer here"
                      />
                    </article>
                  ))}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={submitAssessment}
                      disabled={assessmentSubmitted}
                    >
                      <Send className="h-4 w-4" />
                      Submit Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  {transcriptEntries.length ? (
                    <div className="flex max-h-[420px] min-h-56 flex-col gap-3 overflow-y-auto rounded-md bg-background p-3 text-sm ring-1 ring-border">
                      {transcriptEntries.map((entry) => {
                        const isCandidate =
                          entry.speaker === "Candidate" ||
                          entry.speaker.startsWith("Q[");

                        return (
                          <article
                            key={entry.id}
                            className={
                              isCandidate
                                ? "rounded-md border border-primary/15 bg-primary/5 p-3"
                                : "rounded-md border bg-muted/40 p-3"
                            }
                          >
                            <div className="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                              {entry.speaker}
                            </div>
                            <p className="whitespace-pre-wrap leading-6 text-foreground">
                              {entry.text}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed bg-background text-sm text-muted-foreground">
                      No submitted answers
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Summary & Review</CardTitle>
                </CardHeader>
                <CardContent>
                  {interviewReportId && (
                    <p className="mb-3 break-all font-mono text-xs text-muted-foreground">
                      Report: {interviewReportId}
                    </p>
                  )}
                  <pre className="min-h-56 whitespace-pre-wrap rounded-md bg-background p-4 text-sm leading-6 text-muted-foreground ring-1 ring-border">
                    {summary || "No summary yet"}
                    {review ? `\n\nReview:\n${review}` : ""}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
