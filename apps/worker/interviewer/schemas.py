from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


class StartInterviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    job_title: str = Field(min_length=1)
    job_description: str = Field(min_length=1)
    required_skills: List[str] = Field(default_factory=list)
    mode: Literal["text", "live"] = "text"
    default_question_time_seconds: int = 30
    user_id: Optional[str] = None


class StartInterviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    session_id: str


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str
    text: str
    time_seconds: int


class NextQuestionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    question: Question


class SubmitAnswerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    question_id: str
    answer_text: str = Field(min_length=0)


class SubmitAnswerResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    status: str
    question: Optional[Question] = None
    end_reason: Optional[str] = None
    message: Optional[str] = None
    transcript: List[str] = Field(default_factory=list)
    summary: Optional[str] = None


class StopInterviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    session_id: str
    transcript: List[str]
    summary: Optional[str]
