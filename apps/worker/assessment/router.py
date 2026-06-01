from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from config import get_settings
from reporting import save_phase_report

router = APIRouter(prefix="/assessment", tags=["assessment"])
logger = logging.getLogger("worker.assessment")

AssessmentTaskType = Literal["find_error", "design_concept", "coding"]


class AssessmentStartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    job_title: str = Field(min_length=1)
    job_description: str = Field(min_length=1)
    required_skills: list[str] = Field(default_factory=list)
    interview_transcript: list[str] = Field(default_factory=list)
    candidate_id: str | None = None
    job_offer_id: str | None = None


class AssessmentTask(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str
    type: AssessmentTaskType
    title: str
    prompt: str
    starter_code: str | None = None
    constraints: list[str] = Field(default_factory=list)
    expected_answer_format: str
    time_minutes: int


class AssessmentStartResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    assessment_id: str
    provider: str
    model: str
    tasks: list[AssessmentTask]


class AssessmentSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    candidate_id: str
    job_offer_id: str
    assessment_id: str
    job_title: str
    tasks: list[AssessmentTask]
    answers: dict[str, str]
    cheating_flags: list[str] = Field(default_factory=list)


class AssessmentSubmitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    status: str
    report_id: str | None = None


def _get_groq_key() -> str | None:
    try:
        settings = get_settings()
        if settings.groq_api_key:
            return settings.groq_api_key
    except Exception:
        pass
    return os.getenv("GROQ_API_KEY")


def _get_groq_model() -> str:
    try:
        settings = get_settings()
        return settings.groq_model_name or settings.llm_model_name or "llama-3.3-70b-versatile"
    except Exception:
        return os.getenv("GROQ_MODEL_NAME") or os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile"


def _candidate_groq_models(configured_model: str) -> list[str]:
    candidates = [
        configured_model,
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]
    deduped: list[str] = []
    for model in candidates:
        if model and model not in deduped:
            deduped.append(model)
    return deduped


def _extract_json_object(text: str) -> dict:
    raw_text = text.strip()
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_text, re.DOTALL)
    if match:
        raw_text = match.group(1).strip()
    elif not raw_text.startswith("{"):
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start >= 0 and end > start:
            raw_text = raw_text[start : end + 1]
    return json.loads(raw_text)


def _normalize_tasks(tasks: list[dict]) -> list[AssessmentTask]:
    expected_types: list[AssessmentTaskType] = [
        "find_error",
        "find_error",
        "design_concept",
        "design_concept",
        "coding",
    ]
    normalized: list[AssessmentTask] = []

    for index, expected_type in enumerate(expected_types):
        item = tasks[index] if index < len(tasks) else {}
        normalized.append(
            AssessmentTask(
                id=str(item.get("id") or f"{expected_type}-{uuid.uuid4().hex[:8]}"),
                type=expected_type,
                title=str(item.get("title") or _fallback_title(expected_type, index)),
                prompt=str(item.get("prompt") or _fallback_prompt(expected_type)),
                starter_code=item.get("starter_code"),
                constraints=[
                    str(value)
                    for value in (item.get("constraints") or _fallback_constraints(expected_type))
                    if str(value).strip()
                ],
                expected_answer_format=str(
                    item.get("expected_answer_format") or _fallback_answer_format(expected_type)
                ),
                time_minutes=int(item.get("time_minutes") or (20 if expected_type == "coding" else 10)),
            )
        )

    return normalized


def _fallback_title(task_type: AssessmentTaskType, index: int) -> str:
    if task_type == "find_error":
        return f"Find the Error {index + 1}"
    if task_type == "design_concept":
        return f"Design and Concepts {index - 1}"
    return "Coding Problem"


def _fallback_prompt(task_type: AssessmentTaskType) -> str:
    if task_type == "find_error":
        return (
            "Review the snippet and explain the bug, its production impact, and the safest fix."
        )
    if task_type == "design_concept":
        return (
            "Explain the design trade-offs for a scalable service boundary, including state, failure modes, "
            "and observability."
        )
    return "Implement a small, testable function and explain its time and space complexity."


def _fallback_constraints(task_type: AssessmentTaskType) -> list[str]:
    if task_type == "coding":
        return ["Write code without external libraries.", "Include edge cases.", "Explain complexity."]
    return ["Be specific.", "Mention trade-offs.", "Use examples from the role context."]


def _fallback_answer_format(task_type: AssessmentTaskType) -> str:
    if task_type == "find_error":
        return "Bug, impact, root cause, fixed approach."
    if task_type == "design_concept":
        return "Recommendation, alternatives, trade-offs, failure handling."
    return "Code plus a short explanation."


def _fallback_tasks() -> list[AssessmentTask]:
    return _normalize_tasks([])


def _create_groq_completion(client, model: str, prompt: str, use_json_mode: bool):
    kwargs = {
        "model": model,
        "max_tokens": 4096,
        "temperature": 0.4,
        "messages": [{"role": "user", "content": prompt}],
    }
    if use_json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    return client.chat.completions.create(**kwargs)


@router.post("/start", response_model=AssessmentStartResponse)
async def start_assessment(payload: AssessmentStartRequest):
    groq_key = _get_groq_key()
    model = _get_groq_model()
    if not groq_key:
        return AssessmentStartResponse(
            assessment_id=str(uuid.uuid4()),
            provider="fallback",
            model="local-fallback",
            tasks=_fallback_tasks(),
        )

    skills_text = ", ".join(payload.required_skills) or "role-relevant engineering skills"
    transcript_excerpt = "\n".join(payload.interview_transcript[-12:])
    prompt = f"""
Generate a post-interview problem-solving assessment for this candidate.

Role: {payload.job_title}
Job description: {payload.job_description}
Required skills: {skills_text}
Recent interview transcript:
{transcript_excerpt}

Create exactly five tasks in this order:
1. find_error
2. find_error
3. design_concept
4. design_concept
5. coding

Rules:
- Make the tasks role-relevant and practical.
- The two find_error tasks must include a flawed code/config/design snippet and ask the candidate to identify the issue.
- The two design_concept tasks must test design patterns, architecture concepts, trade-offs, and failure handling.
- The final coding task must be implementable in a browser textarea without external packages.
- Do not include solutions, answer keys, grading rubrics, or hidden hints.
- Return only valid JSON with this schema:
{{
  "tasks": [
    {{
      "id": "string",
      "type": "find_error | design_concept | coding",
      "title": "string",
      "prompt": "string",
      "starter_code": "string or null",
      "constraints": ["string"],
      "expected_answer_format": "string",
      "time_minutes": 10
    }}
  ]
}}
"""

    try:
        from groq import Groq

        client = Groq(api_key=groq_key)
        last_error: Exception | None = None
        for candidate_model in _candidate_groq_models(model):
            for use_json_mode in (True, False):
                try:
                    message = _create_groq_completion(
                        client,
                        candidate_model,
                        prompt,
                        use_json_mode,
                    )
                    response_text = message.choices[0].message.content or ""
                    data = _extract_json_object(response_text)
                    tasks = _normalize_tasks(data.get("tasks") or [])
                    return AssessmentStartResponse(
                        assessment_id=str(uuid.uuid4()),
                        provider="groq",
                        model=candidate_model,
                        tasks=tasks,
                    )
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "[ASSESSMENT] Groq generation failed model=%s json_mode=%s: %s",
                        candidate_model,
                        use_json_mode,
                        exc,
                    )
                    continue

        logger.error("[ASSESSMENT] All Groq attempts failed; returning fallback tasks: %s", last_error)
        return AssessmentStartResponse(
            assessment_id=str(uuid.uuid4()),
            provider="fallback",
            model=f"local-fallback-after-groq-error:{model}",
            tasks=_fallback_tasks(),
        )
    except Exception as exc:
        logger.error("[ASSESSMENT] Assessment generation failed before Groq call: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Assessment generation failed: {exc}") from exc


@router.post("/submit", response_model=AssessmentSubmitResponse)
async def submit_assessment(payload: AssessmentSubmitRequest):
    report_id = save_phase_report(
        candidate_id=payload.candidate_id,
        job_offer_id=payload.job_offer_id,
        phase="problem_solving",
        report={
            "assessment_id": payload.assessment_id,
            "job_title": payload.job_title,
            "tasks": [task.model_dump() for task in payload.tasks],
            "answers": payload.answers,
            "cheating_flags": payload.cheating_flags,
        },
    )
    return AssessmentSubmitResponse(status="saved", report_id=report_id)
