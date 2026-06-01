"""LLM-backed match score explanation generation agent."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from langchain_core.prompts import ChatPromptTemplate

from config import get_settings
from matching.gap_report_agent import _get_structured_llm


class ExplanationResult(BaseModel):
    """Structured explanation returned by the LLM."""

    model_config = ConfigDict(extra="forbid", strict=True)

    strengths: list[str] = Field(description="A list of 2-3 sentences explaining the candidate's strengths relative to the role.")
    weaknesses: list[str] = Field(description="A list of 2-3 sentences explaining the candidate's main gaps or weaknesses.")
    summary: str = Field(description="A short paragraph summarizing the overall match.")


class MatchScoreExplanationError(RuntimeError):
    """Raised when match score explanation generation fails."""


@lru_cache(maxsize=1)
def _get_explanation_prompt() -> ChatPromptTemplate:
    """Create prompt template for match score explanation generation."""

    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an expert technical recruiter."
                " Your task is to explain a candidate's match score for a specific role."
                " Provide a balanced, objective, and professional assessment of their strengths and weaknesses."
                " Focus on the provided matched and missing skills."
                " Return only data matching the expected output schema.",
            ),
            (
                "human",
                "Role title: {role_title}\n"
                "Match Score: {score}%\n"
                "Matched skills: {matched_skills}\n"
                "Missing skills: {missing_skills}\n"
                "Please explain this match score.",
            ),
        ],
    )


def generate_match_explanation(
    role_title: str,
    score: int,
    matched_skills: list[Any],
    missing_skills: list[Any],
) -> ExplanationResult:
    """Generate an explanation for a given match score.

    Args:
        role_title: Human-readable role title.
        score: The compatibility score (0-100).
        matched_skills: The skills the candidate matched.
        missing_skills: The skills the candidate is missing.

    Returns:
        A validated ExplanationResult.

    Raises:
        MatchScoreExplanationError: On LLM failures.
    """
    logging.info(f"Generating match explanation for role '{role_title}' with score {score}")

    prompt = _get_explanation_prompt()
    try:
        settings = get_settings()
        # We can reuse _get_structured_llm but need to wrap it with ExplanationResult
        # To keep it clean without rewriting logic, we'll recreate it here or import the base LLM.
        # Let's import the same providers logic.
        from matching.gap_report_agent import _get_structured_llm as get_llm
        
        # We need the base LLM without the GapReportResult structure
        # _get_structured_llm from gap_report_agent returns llm.with_structured_output(GapReportResult)
        # So we can't reuse it directly. We must create a new one.
        pass
    except Exception as exc:
        pass

    # Let's recreate the LLM logic here for ExplanationResult
    def _get_local_structured_llm() -> Any:
        from langchain_anthropic import ChatAnthropic
        from langchain_openai import ChatOpenAI
        from langchain_groq import ChatGroq
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_ollama import ChatOllama
        settings = get_settings()

        if getattr(settings, "groq_api_key", None):
            try:
                groq_model = settings.groq_model_name or settings.llm_model_name
                llm = ChatGroq(model=groq_model, api_key=settings.groq_api_key, timeout=20)
                return llm.with_structured_output(ExplanationResult)
            except Exception:
                pass

        try:
            if getattr(settings, "ollama_base_url", None):
                ollama_model = settings.ollama_model_name or settings.llm_model_name
                llm = ChatOllama(model=ollama_model, base_url=settings.ollama_base_url)
                return llm.with_structured_output(ExplanationResult)
        except Exception:
            pass

        if settings.llm_provider == "openai":
            llm = ChatOpenAI(model=settings.llm_model_name, api_key=settings.openai_api_key, timeout=20)
        elif settings.llm_provider == "anthropic":
            llm = ChatAnthropic(model=settings.llm_model_name, api_key=settings.anthropic_api_key, timeout=20)
        elif settings.llm_provider == "groq":
            groq_model = settings.groq_model_name or settings.llm_model_name
            llm = ChatGroq(model=groq_model, api_key=settings.groq_api_key, timeout=20)
        elif settings.llm_provider == "gemini":
            llm = ChatGoogleGenerativeAI(model=settings.llm_model_name, google_api_key=settings.gemini_api_key, timeout=20)
        elif settings.llm_provider == "ollama":
            ollama_model = settings.ollama_model_name or settings.llm_model_name
            llm = ChatOllama(model=ollama_model, base_url=settings.ollama_base_url)
        else:
            raise MatchScoreExplanationError(f"Unsupported LLM provider: {settings.llm_provider}")

        return llm.with_structured_output(ExplanationResult)

    try:
        structured_llm = _get_local_structured_llm()
    except Exception as exc:
        raise MatchScoreExplanationError(f"Failed to initialize LLM: {str(exc)}") from exc

    chain = prompt | structured_llm

    try:
        result = chain.invoke(
            {
                "role_title": role_title,
                "score": score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
            }
        )
    except Exception as exc:
        raise MatchScoreExplanationError(f"Failed to generate explanation from LLM: {str(exc)}") from exc

    if isinstance(result, ExplanationResult):
        return result

    try:
        return ExplanationResult.model_validate(result)
    except Exception as exc:
        raise MatchScoreExplanationError("LLM returned malformed structured output") from exc
