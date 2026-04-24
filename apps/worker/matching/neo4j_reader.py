"""Neo4j helpers for candidate skill confidence lookups."""

from __future__ import annotations

from neo4j import Driver, GraphDatabase
from neo4j.exceptions import Neo4jError

from config import get_settings


class Neo4jConnectionError(RuntimeError):
    """Raised when Neo4j cannot be queried."""


class Neo4jReader:
    """Read-only Neo4j reader for skill graph information."""

    def __init__(self) -> None:
        settings = get_settings()
        self._driver: Driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )

    def close(self) -> None:
        """Close Neo4j driver connections."""

        self._driver.close()

    def get_candidate_skill_confidence(self, candidate_id: str, skill_name: str) -> float | None:
        """Fetch confidence for a candidate/skill relation.

        Args:
            candidate_id: Candidate UUID string.
            skill_name: Normalized skill name.

        Returns:
            Confidence value if relation exists, otherwise None.

        Raises:
            Neo4jConnectionError: If the query fails due to connectivity or query issues.
        """

        query = """
        MATCH (c:Candidate {id: $candidate_id})-[r:HAS_SKILL]->(s:Skill {normalized_name: $skill_name})
        RETURN r.confidence AS confidence
        LIMIT 1
        """

        try:
            with self._driver.session() as session:
                record = session.run(
                    query,
                    candidate_id=candidate_id,
                    skill_name=skill_name,
                ).single()
        except Neo4jError as exc:
            raise Neo4jConnectionError("Failed to query candidate skill confidence from Neo4j") from exc

        if not record:
            return None

        confidence = record.get("confidence")
        if confidence is None:
            return None

        return float(confidence)


def map_confidence_to_level(confidence: float | None) -> str:
    """Map confidence score into a gap-report level label."""

    if confidence is None or confidence <= 0:
        return "none"
    if confidence <= 0.4:
        return "beginner"
    return "intermediate"
