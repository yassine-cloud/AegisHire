from __future__ import annotations

import json
import logging
from typing import Any

import psycopg

from config import get_settings

logger = logging.getLogger("worker.reporting")


def save_phase_report(
    *,
    candidate_id: str | None,
    job_offer_id: str | None,
    phase: str,
    report: dict[str, Any],
) -> str | None:
    if not candidate_id or not job_offer_id:
        logger.info("[REPORTING] Skipping %s report persistence; missing candidate/job offer id", phase)
        return None

    settings = get_settings()
    query = """
    INSERT INTO interview_phase_reports (candidate_id, job_offer_id, phase, report)
    VALUES (%(candidate_id)s, %(job_offer_id)s, %(phase)s, %(report)s::jsonb)
    RETURNING id
    """

    with psycopg.connect(settings.database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                {
                    "candidate_id": candidate_id,
                    "job_offer_id": job_offer_id,
                    "phase": phase,
                    "report": json.dumps(report),
                },
            )
            row = cursor.fetchone()
        connection.commit()

    return str(row[0]) if row else None
