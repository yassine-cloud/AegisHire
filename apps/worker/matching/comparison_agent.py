"""Comparison logic to match candidates to roles."""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, ConfigDict

from matching.neo4j_reader import Neo4jReader


class ComparisonResult(BaseModel):
    """Result of comparing a candidate to a role."""

    model_config = ConfigDict(extra="forbid", strict=True)

    compatibility_score: int
    matched_skills: list[dict[str, Any]]
    missing_skills: list[dict[str, Any]]


def _extract_skill_name(item: Any) -> str | None:
    if isinstance(item, str):
        return item.strip() or None
    if isinstance(item, dict):
        for key in ("skill", "name", "normalized_name"):
            val = item.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
    return None


def compare_candidate_to_role(
    candidate_id: str,
    required_skills: list[Any],
    preferred_skills: list[Any],
) -> ComparisonResult:
    """Compare a candidate's skills against role requirements.

    Args:
        candidate_id: The candidate UUID.
        required_skills: The list of required skills.
        preferred_skills: The list of preferred skills.

    Returns:
        A ComparisonResult containing score, matched skills, and missing skills.
    """
    logging.info(f"Comparing candidate {candidate_id} to role skills")
    
    reader = Neo4jReader()
    try:
        candidate_skills = reader.get_candidate_skills(candidate_id)
    except Exception as exc:
        logging.error(f"Failed to fetch candidate skills: {exc}", exc_info=True)
        # Fallback to empty if Neo4j is down
        candidate_skills = {}
    finally:
        reader.close()
        
    req_skills_set = {}
    for item in required_skills or []:
        name = _extract_skill_name(item)
        if name:
            req_skills_set[name.lower()] = name

    pref_skills_set = {}
    for item in preferred_skills or []:
        name = _extract_skill_name(item)
        if name:
            pref_skills_set[name.lower()] = name

    matched = []
    missing = []
    total_weight = 0.0
    earned_weight = 0.0

    # Required skills are weighted heavily
    REQUIRED_WEIGHT = 2.0
    PREFERRED_WEIGHT = 1.0

    # Process required skills
    for norm_skill, display_skill in req_skills_set.items():
        total_weight += REQUIRED_WEIGHT
        if norm_skill in candidate_skills:
            confidence = candidate_skills[norm_skill]
            matched.append({"skill": display_skill, "importance": "high", "confidence": confidence})
            earned_weight += REQUIRED_WEIGHT * confidence
        else:
            missing.append({"skill": display_skill, "importance": "high"})

    # Process preferred skills
    for norm_skill, display_skill in pref_skills_set.items():
        total_weight += PREFERRED_WEIGHT
        if norm_skill in candidate_skills:
            confidence = candidate_skills[norm_skill]
            matched.append({"skill": display_skill, "importance": "medium", "confidence": confidence})
            earned_weight += PREFERRED_WEIGHT * confidence
        else:
            missing.append({"skill": display_skill, "importance": "medium"})

    if total_weight > 0:
        score = int((earned_weight / total_weight) * 100)
    else:
        score = 0

    return ComparisonResult(
        compatibility_score=score,
        matched_skills=matched,
        missing_skills=missing
    )
