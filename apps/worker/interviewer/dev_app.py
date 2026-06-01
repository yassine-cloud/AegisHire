from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse


WORKER_ROOT = Path(__file__).resolve().parents[1]
if str(WORKER_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKER_ROOT))

load_dotenv(WORKER_ROOT / ".env")

from interviewer.router import router as interview_router  # noqa: E402


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="Interviewer Test Harness",
    description="Standalone local UI for developing the interviewer module.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(Path(__file__).with_name("dev_frontend.html"))


@app.get("/dev/job-context")
def job_context() -> JSONResponse:
    context_path = Path(__file__).with_name("job_context.json")
    if not context_path.exists():
        return JSONResponse({"exists": False, "context": None})

    try:
        with context_path.open("r", encoding="utf-8") as file:
            context = json.load(file)
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"exists": True, "error": f"Could not read job_context.json: {exc}"},
        )

    return JSONResponse({"exists": True, "context": context})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "module": "interviewer"}
