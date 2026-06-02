"""LLM-backed parser for external job descriptions."""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from pydantic import ValidationError

from config import get_settings
from matching.schemas import ParsedJob


class JobParsingError(RuntimeError):
    """Raised when external job parsing fails."""


@lru_cache(maxsize=1)
def _get_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a precise recruiting operations parser."
                " Extract a job description into the expected schema."
                " Use concise strings, preserve concrete requirements, and infer skills only when clearly supported."
                " Split required skills from preferred skills when the source text distinguishes them."
                " Return only data matching the expected output schema.",
            ),
            (
                "human",
                "Company name: {company_name}\n"
                "Raw job description:\n{text}\n\n"
                "Extract title, location, employment type, description, responsibilities,"
                " requirements, required skills, preferred skills, experience years,"
                " seniority, and a brief summary.",
            ),
        ],
    )


def _structured_llm_for(schema: type[ParsedJob]) -> Any:
    settings = get_settings()

    if getattr(settings, "groq_api_key", None):
        try:
            groq_model = settings.groq_model_name or settings.llm_model_name
            logging.info("Using Groq provider for external job parsing: %s", groq_model)
            llm = ChatGroq(model=groq_model, api_key=settings.groq_api_key, timeout=20)
            return llm.with_structured_output(schema)
        except Exception as exc:  # pragma: no cover - runtime fallback
            logging.warning("Groq initialization failed for job parsing: %s", exc)

    try:
        if getattr(settings, "ollama_base_url", None):
            ollama_model = settings.ollama_model_name or settings.llm_model_name
            logging.info("Using Ollama provider for external job parsing: %s", ollama_model)
            llm = ChatOllama(model=ollama_model, base_url=settings.ollama_base_url)
            return llm.with_structured_output(schema)
    except Exception as exc:  # pragma: no cover - runtime fallback
        logging.warning("Ollama initialization failed for job parsing: %s", exc)

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
        raise JobParsingError(f"Unsupported LLM provider: {settings.llm_provider}")

    return llm.with_structured_output(schema)


def _fallback_parse(company_name: str, text: str) -> ParsedJob:
    """Return a conservative parser result when no LLM is available."""

    lines = [line.strip(" -\t") for line in text.splitlines() if line.strip()]
    title = lines[0][:120] if lines else "External role"
    bullet_lines = [
        line.strip(" -\t")
        for line in lines
        if line.startswith(("-", "*")) and len(line.strip(" -\t")) > 2
    ]

    skill_candidates = re.findall(
        r"\b(?:Python|JavaScript|TypeScript|React|Next\.js|Node\.js|NestJS|FastAPI|Django|Java|C\+\+|C#|Go|Rust|SQL|PostgreSQL|MySQL|MongoDB|Redis|Docker|Kubernetes|AWS|Azure|GCP|CI/CD|Git|Linux|Terraform|GraphQL|REST)\b",
        text,
        flags=re.IGNORECASE,
    )
    seen: set[str] = set()
    required_skills: list[str] = []
    for skill in skill_candidates:
        normalized = skill.lower()
        if normalized not in seen:
            seen.add(normalized)
            required_skills.append(skill)

    years_match = re.search(r"(\d+)\+?\s*(?:years|yrs)", text, flags=re.IGNORECASE)
    experience_years = int(years_match.group(1)) if years_match else None

    return ParsedJob(
        title=title,
        companyName=company_name,
        description=text[:1200],
        responsibilities=bullet_lines[:8],
        requirements=bullet_lines[:12],
        requiredSkills=required_skills,
        preferredSkills=[],
        experienceYears=experience_years,
        summary=text[:300],
    )


def parse_external_job(company_name: str, text: str) -> ParsedJob:
    """Extract a structured transient job from raw external text."""

    prompt = _get_prompt()
    try:
        structured_llm = _structured_llm_for(ParsedJob)
        result = (prompt | structured_llm).invoke(
            {
                "company_name": company_name,
                "text": text,
            }
        )
    except Exception as exc:
        logging.warning("LLM job parsing failed, using conservative fallback: %s", exc)
        return _fallback_parse(company_name, text)

    if isinstance(result, ParsedJob):
        parsed = result
    else:
        try:
            parsed = ParsedJob.model_validate(result)
        except ValidationError as exc:
            raise JobParsingError("LLM returned malformed job extraction") from exc

    return parsed.model_copy(
        update={
            "companyName": company_name,
            "description": parsed.description or text[:1200],
        }
    )
