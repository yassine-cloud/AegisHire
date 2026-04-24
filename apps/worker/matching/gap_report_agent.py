"""LLM-backed gap report generation agent."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from pydantic import ValidationError
import logging

from config import get_settings
from matching.schemas import GapReportResult, MissingSkill


class GapReportGenerationError(RuntimeError):
    """Raised when gap report generation fails."""


@lru_cache(maxsize=1)
def _get_prompt() -> ChatPromptTemplate:
    """Create prompt template for structured recommendation generation."""

    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a senior technical career advisor."
                " Generate specific and actionable skill-improvement recommendations"
                " for each missing skill. Keep recommendations concrete and implementation-focused."
                " Return only data matching the expected output schema.",
            ),
            (
                "human",
                "Role title: {role_title}\n"
                "Missing skills payload: {missing_skills_with_levels}\n"
                "Return structured output where each gap includes"
                " skill, importance, current_level, recommendation, estimated_effort."
                " Also return overall_priority_order sorted by impact and urgency.",
            ),
        ],
    )


@lru_cache(maxsize=1)
def _get_structured_llm() -> Any:
    """Build and cache structured-output LLM chain."""

    settings = get_settings()
    # Preference: Groq (if API key present) -> Ollama -> explicit `llm_provider` selection
    # Try Groq first when configured
    if getattr(settings, "groq_api_key", None):
        try:
            groq_model = settings.groq_model_name or settings.llm_model_name
            logging.info(f"Using Groq provider with model: {groq_model}")
            llm = ChatGroq(model=groq_model, api_key=settings.groq_api_key, timeout=20)
            return llm.with_structured_output(GapReportResult)
        except Exception as exc:  # pragma: no cover - runtime fallback
            logging.warning(f"Groq initialization failed, falling back to other providers: {exc}")

    # Try Ollama next when available
    try:
        if getattr(settings, "ollama_base_url", None):
            ollama_model = settings.ollama_model_name or settings.llm_model_name
            logging.info(f"Attempting Ollama provider with model: {ollama_model}")
            llm = ChatOllama(model=ollama_model, base_url=settings.ollama_base_url)
            return llm.with_structured_output(GapReportResult)
    except Exception as exc:  # pragma: no cover - runtime fallback
        logging.warning(f"Ollama initialization failed, falling back to explicit provider selection: {exc}")

    # Fallback to explicit provider selection from settings
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
        raise GapReportGenerationError(f"Unsupported LLM provider: {settings.llm_provider}")

    return llm.with_structured_output(GapReportResult)


def generate_gap_report(
    candidate_id: str,
    role_id: str,
    missing_skills: list[dict[str, Any]],
    role_title: str,
) -> GapReportResult:
    """Generate personalized gap report using missing skills and LLM.

    Args:
        candidate_id: Candidate UUID string.
        role_id: Role slug.
        missing_skills: Missing skill dictionaries with skill and importance keys.
        role_title: Human-readable role title.

    Returns:
        A validated GapReportResult.

    Raises:
        GapReportGenerationError: On LLM failures or malformed outputs.
    """

    logging.info(f"Generating gap report for candidate={candidate_id}, role={role_id}, role_title={role_title}")
    
    if not missing_skills:
        logging.info("No missing skills provided, returning empty report")
        return GapReportResult(gaps=[], overall_priority_order=[])

    normalized_missing_skills = [MissingSkill.model_validate(item) for item in missing_skills]
    logging.info(f"Normalized {len(normalized_missing_skills)} missing skills")

    missing_skills_with_levels: list[dict[str, str]] = []
    for missing_skill in normalized_missing_skills:
        # Defaulting all missing skills to level "none"
        missing_skills_with_levels.append(
            {
                "skill": missing_skill.skill,
                "importance": missing_skill.importance,
                "current_level": "none",
            }
        )

    prompt = _get_prompt()
    try:
        logging.info("Getting structured LLM instance")
        structured_llm = _get_structured_llm()
    except Exception as exc:
        logging.error(f"Failed to initialize LLM: {exc}", exc_info=True)
        raise GapReportGenerationError(f"Failed to initialize LLM: {str(exc)}") from exc

    chain = prompt | structured_llm

    try:
        logging.info(f"Invoking LLM chain with {len(missing_skills_with_levels)} skills")
        result = chain.invoke(
            {
                "role_id": role_id,
                "role_title": role_title,
                "missing_skills_with_levels": missing_skills_with_levels,
            }
        )
        logging.info(f"LLM chain completed successfully")
    except ValidationError as exc:
        logging.error(f"LLM returned malformed structured output: {exc}", exc_info=True)
        raise GapReportGenerationError("LLM returned malformed structured output") from exc
    except Exception as exc:
        logging.error(f"Failed to generate gap report from LLM: {exc}", exc_info=True)
        raise GapReportGenerationError(f"Failed to generate gap report from LLM: {str(exc)}") from exc

    if isinstance(result, GapReportResult):
        logging.info(f"Gap report result is already GapReportResult, returning with {len(result.gaps)} gaps")
        return result

    try:
        logging.info("Validating LLM result as GapReportResult")
        validated_result = GapReportResult.model_validate(result)
        logging.info(f"Successfully generated gap report with {len(validated_result.gaps)} gaps")
        return validated_result
    except ValidationError as exc:
        logging.error(f"LLM returned malformed structured output on validation: {exc}", exc_info=True)
        raise GapReportGenerationError("LLM returned malformed structured output") from exc
