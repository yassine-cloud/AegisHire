"""Utility functions for gap report matching."""

from __future__ import annotations


def map_confidence_to_level(confidence: float | None) -> str:
    """Map confidence score into a gap-report level label."""

    if confidence is None or confidence <= 0:
        return "none"
    if confidence <= 0.4:
        return "beginner"
    return "intermediate"
