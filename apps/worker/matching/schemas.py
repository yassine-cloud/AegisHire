"""Pydantic schemas for gap report generation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class GapEntry(BaseModel):
    """Single skill gap recommendation entry."""

    model_config = ConfigDict(extra="forbid", strict=True)

    skill: str = Field(min_length=1)
    importance: Literal["high", "medium", "low"]
    current_level: Literal["none", "beginner", "intermediate"]
    recommendation: str = Field(min_length=1)
    estimated_effort: str = Field(min_length=1)


class GapReportResult(BaseModel):
    """Structured report returned by the worker."""

    model_config = ConfigDict(extra="forbid", strict=True)

    gaps: list[GapEntry]
    overall_priority_order: list[str]


class GenerateReportRequest(BaseModel):
    """Input payload for the internal gap-report endpoint."""

    model_config = ConfigDict(extra="forbid", strict=True)

    candidate_id: str = Field(min_length=1)
    role_id: str = Field(min_length=1)


class MissingSkill(BaseModel):
    """Normalized missing-skill input used by the agent."""

    model_config = ConfigDict(extra="forbid", strict=True)

    skill: str = Field(min_length=1)
    importance: Literal["high", "medium", "low"]


class CompareRoleRequest(BaseModel):
    """Input payload for candidate-role comparison."""

    model_config = ConfigDict(extra="forbid", strict=True)

    candidate_id: str = Field(min_length=1)
    role_id: str = Field(min_length=1)
    required_skills: list[Any] = Field(default_factory=list)
    preferred_skills: list[Any] = Field(default_factory=list)


class ExplainMatchScoreRequest(BaseModel):
    """Input payload for generating match score explanation."""

    model_config = ConfigDict(extra="forbid", strict=True)

    role_title: str = Field(min_length=1)
    compatibility_score: int
    matched_skills: list[Any] = Field(default_factory=list)
    missing_skills: list[Any] = Field(default_factory=list)

