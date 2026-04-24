import os
import tempfile
import traceback
import logging
from typing import Any

import psycopg
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from config import get_settings
from matching.gap_report_agent import GapReportGenerationError, generate_gap_report
from matching.schemas import GapReportResult, GenerateReportRequest

# Add parsers directory to path
sys.path.insert(0, str(Path(__file__).parent / "parsers"))

try:
    from cvParser import CVParser
except ImportError as e:
    print(f"Error importing CVParser: {e}")
    CVParser = None

app = FastAPI(
    title="AegisHire CV Parser API",
    description="API for parsing CV documents and extracting structured information",
    version="1.0.0"
)



# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _extract_skill_name(skill_item: Any) -> str | None:
    """Extract skill name from JSON skill structures."""

    if isinstance(skill_item, str):
        return skill_item.strip() or None

    if isinstance(skill_item, dict):
        for key in ("skill", "name", "normalized_name"):
            value = skill_item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    return None


def _derive_importance(
    skill_name: str,
    declared_importance: Any,
    required_skills: set[str],
    preferred_skills: set[str],
) -> str:
    """Resolve importance using role skill lists when missing in payload."""

    if isinstance(declared_importance, str):
        normalized_importance = declared_importance.strip().lower()
        if normalized_importance in {"high", "medium", "low"}:
            return normalized_importance

    normalized_skill = skill_name.lower()
    if normalized_skill in required_skills:
        return "high"
    if normalized_skill in preferred_skills:
        return "medium"
    return "low"


def _normalize_missing_skills(
    missing_skills: Any,
    required_skill_payload: Any,
    preferred_skill_payload: Any,
) -> list[dict[str, str]]:
    """Normalize stored JSON payload into agent-ready missing skills."""

    required_skills = {
        skill_name.lower()
        for item in (required_skill_payload or [])
        if (skill_name := _extract_skill_name(item))
    }
    preferred_skills = {
        skill_name.lower()
        for item in (preferred_skill_payload or [])
        if (skill_name := _extract_skill_name(item))
    }

    normalized: list[dict[str, str]] = []
    for item in missing_skills or []:
        skill_name = _extract_skill_name(item)
        if not skill_name:
            continue

        declared_importance = item.get("importance") if isinstance(item, dict) else None
        importance = _derive_importance(skill_name, declared_importance, required_skills, preferred_skills)
        normalized.append({"skill": skill_name, "importance": importance})

    return normalized


def _fetch_role_gap_context(candidate_id: str, role_slug: str) -> tuple[str, list[dict[str, str]]]:
    """Fetch role title and normalized missing skill payload from PostgreSQL."""

    logger.info(f"Fetching role gap context for candidate_id={candidate_id}, role_slug={role_slug}")
    
    settings = get_settings()
    query = """
    SELECT
      r.title,
      rm.missing_skills,
      r."requiredSkills",
      r."preferredSkills"
    FROM role_matches rm
    INNER JOIN roles r ON r.id = rm.role_id
    WHERE rm.candidate_id = %(candidate_id)s AND r.slug = %(role_slug)s
    LIMIT 1
    """

    try:
        with psycopg.connect(settings.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, {"candidate_id": candidate_id, "role_slug": role_slug})
                row = cursor.fetchone()
    except Exception as exc:
        logger.error(f"Database query failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "statusCode": 500,
                "error": "DB_ERROR",
                "message": f"Failed to fetch role context from database: {str(exc)}",
            },
        ) from exc

    if row is None:
        logger.warning(f"Role match not found for candidate_id={candidate_id}, role_slug={role_slug}")
        raise HTTPException(
            status_code=404,
            detail={
                "statusCode": 404,
                "error": "ROLE_NOT_FOUND",
                "message": "Role match not found for this candidate.",
            },
        )

    role_title, missing_skills, required_skills, preferred_skills = row
    logger.info(f"Successfully fetched role: title={role_title}, missing_skills_count={len(missing_skills or [])}")
    normalized_missing = _normalize_missing_skills(missing_skills, required_skills, preferred_skills)
    logger.info(f"Normalized {len(normalized_missing)} missing skills")
    return role_title, normalized_missing


@app.on_event("startup")
def startup_event() -> None:
    """Validate settings and initialize shared clients."""

    get_settings()


@app.on_event("shutdown")
def shutdown_event() -> None:
    """Close shared clients on app shutdown."""
    pass

@app.get("/")
def root():
    """Serve the HTML upload interface"""
    html_file = Path(__file__).parent / "upload.html"
    if html_file.exists():
        return FileResponse(html_file, media_type="text/html")
    return {
        "message": "CV Parser API",
        "version": "1.0.0",
        "docs": "/docs",
        "upload": "Open /upload.html"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/worker/generate-report", response_model=GapReportResult)
async def generate_report(payload: GenerateReportRequest) -> GapReportResult:
    """Generate and return a structured gap report for one candidate-role pair."""

    logger.info(f"Received gap report request: candidate_id={payload.candidate_id}, role_id={payload.role_id}")
    
    try:
        role_title, missing_skills = _fetch_role_gap_context(payload.candidate_id, payload.role_id)
        logger.info(f"Fetched context: role_title={role_title}, missing_skills_count={len(missing_skills)}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to fetch role context: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch role context: {str(exc)}"
        ) from exc

    if not missing_skills:
        logger.info("No missing skills, returning empty gap report")
        return GapReportResult(gaps=[], overall_priority_order=[])

    try:
        logger.info(f"Starting gap report generation with {len(missing_skills)} missing skills")
        result = await run_in_threadpool(
            generate_gap_report,
            payload.candidate_id,
            payload.role_id,
            missing_skills,
            role_title,
        )
        logger.info(f"Successfully generated gap report with {len(result.gaps)} gaps")
        return result
    except GapReportGenerationError as exc:
        logger.error(f"Gap report generation failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Gap report generation failed: {str(exc)}"
        ) from exc
    except Exception as exc:
        logger.error(f"Unexpected error during gap report generation: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(exc)}"
        ) from exc

@app.post("/parse-cv")
async def parse_cv(file: UploadFile = File(...)):
    """
    Upload a CV file (PDF or image) and get parsed structured data.
    
    - Accepts: PDF, PNG, JPG, JPEG, BMP, TIFF, GIF
    - Returns: Structured CV data (name, contact, skills, education, work experience, etc.)
    """
    tmp_path = None
    try:
        # Check if CVParser is available
        if CVParser is None:
            return JSONResponse(
                status_code=500,
                content={"error": "CVParser not available. Check server logs."}
            )
        
        # Validate file type
        allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif"}
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unsupported file type: {file_ext}. Allowed types: {', '.join(allowed_extensions)}"}
            )
        
        # Save uploaded file to temporary location
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
        tmp_path = tmp_file.name
        
        contents = await file.read()
        tmp_file.write(contents)
        tmp_file.flush()
        tmp_file.close()
        
        print(f"Processing file: {file.filename}")
        
        # Extract text from PDF/image
        text = CVParser.extract_text_from_pdf(tmp_path, use_ocr=True)
        
        if not text.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "No text could be extracted from the uploaded file"}
            )
        
        print(f"Extracted text length: {len(text)}")
        
        # Determine if AI parsing is available (Groq first, Ollama fallback)
        has_groq = bool(os.getenv("GROQ_API_KEY"))
        has_ollama = bool(os.getenv("OLLAMA_BASE_URL")) and bool(
            os.getenv("OLLAMA_MODEL") or os.getenv("LLM_MODEL_NAME")
        )
        use_ai = has_groq or has_ollama
        ai_mode = "groq" if has_groq else ("ollama" if has_ollama else "regex")
        print(f"Using AI parsing: {use_ai} ({ai_mode})")
        
        # Parse CV
        parser = CVParser(text, use_ai=use_ai)
        cv = parser.parse()
        
        result = {
            "success": True,
            "cv": cv.to_dict(),
            "parsing_mode": "AI" if use_ai else "Regex",
            "parsing_provider": ai_mode,
            "filename": file.filename
        }
        
        return JSONResponse(status_code=200, content=result)
        
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"Error processing file: {error_msg}")
        print(f"Traceback: {error_trace}")
        
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Error processing file: {error_msg}",
                "details": error_trace
            }
        )
    finally:
        # Clean up temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as e:
                print(f"Error cleaning up temp file: {e}")
