"""AI-powered interview question generator using Gemini."""

import json
import os
import re
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any

# Configure logger for interviewer module
logger = logging.getLogger("worker.interviewer")

def _load_gemini_key() -> str | None:
    """Load GEMINI_API_KEY from .env file directly, bypassing pydantic settings."""
    # First check OS environment
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        val = key.strip().strip('"').strip("'")
        logger.info(f"✓ Found GEMINI_API_KEY in environment variables (length={len(val)})")
        return val

    # Manually read .env file from the worker root
    env_path = Path(__file__).parent.parent / ".env"
    logger.info(f"[LOG] Looking for .env file at: {env_path}")
    if not env_path.exists():
        logger.error(f"✗ .env file NOT found at {env_path}")
        return None

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                if k.strip() == "GEMINI_API_KEY":
                    val = v.strip().strip('"').strip("'")
                    if val:
                        logger.info(f"✓ Found GEMINI_API_KEY in .env file (length={len(val)})")
                        return val
        logger.warning("[LOG] GEMINI_API_KEY line not found in .env file")
    except Exception as e:
        logger.error(f"✗ Error reading .env file at {env_path}: {e}", exc_info=True)

    logger.error("✗ GEMINI_API_KEY not found in environment or .env file")
    return None


def generate_interview_questions_with_ai(
    job_title: str, job_description: str, skills: List[str]
) -> List[Dict[str, Any]]:
    """
    Generate dynamic interview questions using Gemini based on Job Description and Skills.
    Capped at 5-6 questions with dynamic time allocations.
    """

    logger.info("=" * 80)
    logger.info(f"[START] AI Question Generation | Role: '{job_title}' | Skills: {skills}")
    logger.info("=" * 80)

    prompt = f"""
You are an expert technical hiring manager conducting an interview for the role of: {job_title}.

Job Description:
{job_description}

Required Skills:
{', '.join(skills)}

Task:
Generate exactly 5 to 6 high-quality, conceptual interview questions for this candidate. 
The questions MUST heavily incorporate the Job Description context so they are highly relevant to the actual daily work (e.g. if the JD mentions microservices, ask about microservices scaling).
DO NOT ask complex coding/whiteboard questions (e.g., "write a function that..."). Focus on system design, conceptual understanding, trade-offs, and behavioral experience. Group multiple skills together where it makes sense.

For each question, assign an appropriate time limit (time_seconds) based on the depth required:
- Introductory/Behavioral: 45 to 60 seconds
- Standard conceptual: 60 to 90 seconds
- Deep system design or trade-off analysis: 90 to 120 seconds

Return the response STRICTLY as a JSON object matching this schema. Do not include markdown formatting, just the raw JSON:
{{
  "questions": [
    {{ "id": "unique-string-id", "text": "Question text here", "time_seconds": 90 }}
  ]
}}
"""

    # --- Step 1: Get API Key ---
    logger.info("[STEP 1] Loading GEMINI_API_KEY...")
    gemini_key = _load_gemini_key()
    if not gemini_key:
        logger.error("✗ [FALLBACK] No Gemini API key available. Falling back to 3 static questions.")
        result = _fallback_questions(job_title, skills)
        logger.info(f"[RESULT] Returning {len(result)} fallback questions")
        return result

    logger.info("✓ [STEP 1] API key loaded successfully")

    # --- Step 2: Import Gemini client ---
    logger.info("[STEP 2] Importing google.genai module...")
    try:
        os.environ["GEMINI_API_KEY"] = gemini_key
        from google import genai
        logger.info("✓ [STEP 2] Successfully imported google.genai")
    except ImportError as e:
        logger.error(f"✗ [IMPORT ERROR] Failed to import google.genai: {e}", exc_info=True)
        logger.error("→ This means google-genai package is not installed. Install with: pip install google-genai")
        result = _fallback_questions(job_title, skills)
        logger.info(f"[FALLBACK] Returning {len(result)} hardcoded questions due to import error")
        return result

    # --- Step 3: Create Gemini client ---
    logger.info("[STEP 3] Creating Gemini client...")
    try:
        client = genai.Client(api_key=gemini_key)
        logger.info("✓ [STEP 3] Gemini client created successfully")
    except Exception as e:
        logger.error(f"✗ [CLIENT ERROR] Failed to create Gemini client: {e}", exc_info=True)
        result = _fallback_questions(job_title, skills)
        logger.info(f"[FALLBACK] Returning {len(result)} hardcoded questions due to client creation error")
        return result

    # --- Step 4: Try candidate models ---
    candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"]
    logger.info(f"[STEP 4] Will try {len(candidate_models)} models: {candidate_models}")
    
    last_error = None
    for model_idx, model_name in enumerate(candidate_models, 1):
        try:
            logger.info(f"[MODEL {model_idx}/{len(candidate_models)}] Attempting model='{model_name}'...")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )

            raw_text = response.text
            logger.info(f"✓ [MODEL {model_idx}] API call succeeded. Response length: {len(raw_text)} chars")
            logger.debug(f"[RESPONSE] First 500 chars: {raw_text[:500]}")

            # Clean up markdown code fences if present
            match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_text, re.DOTALL)
            if match:
                logger.info(f"[PARSE] Detected markdown code fences, extracting JSON...")
                raw_text = match.group(1)

            logger.info(f"[PARSE] Parsing JSON from response...")
            data = json.loads(raw_text.strip())
            questions = data.get("questions", [])
            logger.info(f"[PARSE] ✓ Parsed JSON successfully. Found {len(questions)} questions")

            # Ensure unique IDs
            for idx, q in enumerate(questions):
                old_id = q.get("id", "unknown")
                q["id"] = f"ai-gen-{idx + 1}-{uuid.uuid4().hex[:6]}"
                logger.debug(f"  Q{idx + 1}: {old_id} → {q['id']} | text: '{q.get('text', '')[:60]}...'")

            if questions:
                logger.info(f"✓ [SUCCESS] Successfully generated {len(questions)} AI questions using '{model_name}'")
                logger.info("=" * 80)
                logger.info(f"[RESULT] Returning {len(questions)} AI-generated questions (not fallback)")
                logger.info("=" * 80)
                return questions
            else:
                logger.warning(f"[MODEL {model_idx}] Gemini returned an empty questions list")
                continue

        except json.JSONDecodeError as je:
            last_error = je
            logger.warning(f"✗ [MODEL {model_idx}] JSON decode error: {je}")
            logger.warning(f"→ Raw response was: {raw_text[:200]}")
            continue
        except Exception as e:
            last_error = e
            logger.warning(f"✗ [MODEL {model_idx}] Error: {type(e).__name__}: {e}")
            logger.debug(f"[TRACEBACK] Full exception:", exc_info=True)
            continue

    # If all models failed, log the final error with full traceback
    logger.error("=" * 80)
    logger.error("✗ [FAILURE] ALL {0} Gemini models failed!".format(len(candidate_models)))
    logger.error("=" * 80)
    if last_error:
        logger.error(f"Last error: {type(last_error).__name__}: {last_error}", exc_info=last_error)
    result = _fallback_questions(job_title, skills)
    logger.error(f"[FALLBACK] All models failed. Returning {len(result)} hardcoded questions as fallback")
    return result


def _fallback_questions(job_title: str, skills: List[str]) -> List[Dict[str, Any]]:
    """Static fallback questions when AI generation fails."""
    logger.warning("⚠ [FALLBACK] Using 3 hardcoded questions because AI generation failed")
    questions = [
        {"id": "fallback-1", "text": f"Tell me about your experience related to {job_title}.", "time_seconds": 60},
        {"id": "fallback-2", "text": f"How do you apply your skills in {skills[0] if skills else 'your stack'}?", "time_seconds": 90},
        {"id": "fallback-3", "text": "What is the most complex system you have designed?", "time_seconds": 120},
    ]
    logger.warning(f"⚠ [FALLBACK] Fallback questions: {[q['text'][:50] for q in questions]}")
    return questions
