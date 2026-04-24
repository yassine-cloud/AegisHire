"""Tests for gap report generation agent."""

from __future__ import annotations

import json
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from matching.gap_report_agent import (
    GapReportGenerationError,
    _get_prompt,
    _get_structured_llm,
    generate_gap_report,
)
from matching.utils import map_confidence_to_level
from matching.schemas import GapReportResult


class _FakePrompt:
    """Prompt stub that supports prompt | llm composition."""

    def __or__(self, other: object) -> object:
        return other


class _FakeChain:
    """Chain stub with deterministic invoke return value."""

    def __init__(self, return_value: object) -> None:
        self._return_value = return_value

    def invoke(self, _: dict[str, object]) -> object:
        return self._return_value


class _FakeChainRaises:
    """Chain stub that always raises from invoke."""

    def __init__(self, error: Exception) -> None:
        self._error = error

    def invoke(self, _: dict[str, object]) -> object:
        raise self._error


def _load_fixture() -> dict[str, object]:
    fixture_path = Path(__file__).parent / 'fixtures' / 'gap_report_worker_response.json'
    return json.loads(fixture_path.read_text(encoding='utf-8'))


def test_generate_gap_report_happy_path(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture = _load_fixture()

    monkeypatch.setattr('matching.gap_report_agent._get_prompt', lambda: _FakePrompt())
    monkeypatch.setattr('matching.gap_report_agent._get_structured_llm', lambda: _FakeChain(fixture))

    result = generate_gap_report(
        candidate_id='candidate-1',
        role_id='senior-backend-engineer',
        missing_skills=[{'skill': 'Kubernetes', 'importance': 'high'}],
        role_title='Senior Backend Engineer',
    )

    assert isinstance(result, GapReportResult)
    assert result.gaps[0].skill == 'Kubernetes'
    assert result.gaps[0].current_level == 'none'


def test_generate_gap_report_empty_missing_skills_returns_empty() -> None:
    result = generate_gap_report(
        candidate_id='candidate-1',
        role_id='senior-backend-engineer',
        missing_skills=[],
        role_title='Senior Backend Engineer',
    )

    assert result.gaps == []
    assert result.overall_priority_order == []


def test_get_prompt_builds_chat_template() -> None:
    _get_prompt.cache_clear()
    prompt = _get_prompt()

    assert prompt is not None
    assert len(prompt.messages) == 2


def test_map_confidence_zero_to_none() -> None:
    assert map_confidence_to_level(0.0) == 'none'


def test_map_confidence_beginner_range() -> None:
    assert map_confidence_to_level(0.3) == 'beginner'


def test_map_confidence_missing_to_none() -> None:
    assert map_confidence_to_level(None) == 'none'


def test_generate_gap_report_malformed_output_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    malformed = {'gaps': [{'skill': 'Kubernetes'}], 'overall_priority_order': ['Kubernetes']}

    monkeypatch.setattr('matching.gap_report_agent._get_prompt', lambda: _FakePrompt())
    monkeypatch.setattr('matching.gap_report_agent._get_structured_llm', lambda: _FakeChain(malformed))

    with pytest.raises(GapReportGenerationError, match='malformed structured output'):
        generate_gap_report(
            candidate_id='candidate-1',
            role_id='senior-backend-engineer',
            missing_skills=[{'skill': 'Kubernetes', 'importance': 'high'}],
            role_title='Senior Backend Engineer',
        )


def test_generate_gap_report_wraps_llm_runtime_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr('matching.gap_report_agent._get_prompt', lambda: _FakePrompt())
    monkeypatch.setattr(
        'matching.gap_report_agent._get_structured_llm',
        lambda: _FakeChainRaises(RuntimeError('llm unavailable')),
    )

    with pytest.raises(GapReportGenerationError, match='Failed to generate gap report from LLM'):
        generate_gap_report(
            candidate_id='candidate-1',
            role_id='senior-backend-engineer',
            missing_skills=[{'skill': 'Kubernetes', 'importance': 'high'}],
            role_title='Senior Backend Engineer',
        )


def test_generate_gap_report_accepts_model_instance_result(monkeypatch: pytest.MonkeyPatch) -> None:
    model_result = GapReportResult(
        gaps=[
            {
                'skill': 'Kubernetes',
                'importance': 'high',
                'current_level': 'none',
                'recommendation': 'Deploy one project on Minikube.',
                'estimated_effort': '3-4 weeks',
            }
        ],
        overall_priority_order=['Kubernetes'],
    )
    monkeypatch.setattr('matching.gap_report_agent._get_prompt', lambda: _FakePrompt())
    monkeypatch.setattr('matching.gap_report_agent._get_structured_llm', lambda: _FakeChain(model_result))

    result = generate_gap_report(
        candidate_id='candidate-1',
        role_id='senior-backend-engineer',
        missing_skills=[{'skill': 'Kubernetes', 'importance': 'high'}],
        role_title='Senior Backend Engineer',
    )

    assert result == model_result


def test_get_structured_llm_openai_branch(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Settings:
        llm_provider = 'openai'
        llm_model_name = 'gpt-4o'
        openai_api_key = 'sk-test'
        anthropic_api_key = None

    class _FakeLLM:
        def with_structured_output(self, _: type[GapReportResult]) -> str:
            return 'structured-openai'

    _get_structured_llm.cache_clear()
    monkeypatch.setattr('matching.gap_report_agent.get_settings', lambda: _Settings())
    monkeypatch.setattr('matching.gap_report_agent.ChatOpenAI', lambda **_: _FakeLLM())

    assert _get_structured_llm() == 'structured-openai'


def test_get_structured_llm_unsupported_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Settings:
        llm_provider = 'invalid'
        llm_model_name = 'n/a'
        openai_api_key = None
        anthropic_api_key = None

    _get_structured_llm.cache_clear()
    monkeypatch.setattr('matching.gap_report_agent.get_settings', lambda: _Settings())

    with pytest.raises(GapReportGenerationError, match='Unsupported LLM provider'):
        _get_structured_llm()


