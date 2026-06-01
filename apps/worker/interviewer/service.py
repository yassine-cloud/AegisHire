from __future__ import annotations

import uuid
import time
import logging
from typing import Dict, List, Optional
from threading import Lock

from .schemas import StartInterviewRequest

logger = logging.getLogger("worker.interviewer")


class InterviewSession:
    def __init__(self, payload: StartInterviewRequest):
        logger.info("[SESSION] Initializing new InterviewSession...")
        self.id = str(uuid.uuid4())
        logger.info(f"[SESSION] Session ID: {self.id}")
        
        # Default to payload
        self.job_title = payload.job_title
        self.job_description = payload.job_description
        self.required_skills = payload.required_skills
        logger.info(f"[SESSION] Loaded from payload: job_title='{self.job_title}', skills={self.required_skills}")
        
        # Override with mock context if available
        try:
            import json
            import os
            context_path = os.path.join(os.path.dirname(__file__), "job_context.json")
            if os.path.exists(context_path):
                logger.info(f"[SESSION] Found job_context.json at {context_path}, attempting to load...")
                with open(context_path, "r", encoding="utf-8") as f:
                    context = json.load(f)
                self.job_title = context.get("job_title", self.job_title)
                self.job_description = context.get("job_description", self.job_description)
                self.required_skills = context.get("required_skills", self.required_skills)
                logger.info(f"[SESSION] ✓ Overridden with job_context.json: job_title='{self.job_title}', skills={len(self.required_skills)}")
            else:
                logger.info(f"[SESSION] No job_context.json found at {context_path}. Using payload data.")
        except Exception as e:
            logger.error(f"[SESSION] ✗ Error loading job_context.json: {e}", exc_info=True)

        self.mode = payload.mode
        self.default_question_time_seconds = payload.default_question_time_seconds
        self.user_id = payload.user_id

        self.created_at = time.time()
        self.questions = []
        if self.mode == "text":
            logger.info(f"[SESSION] Building questions...")
            self.questions = self._build_questions()
            logger.info(f"[SESSION] ✓ Questions built. Total: {len(self.questions)}")
        else:
            logger.info("[SESSION] Live mode selected. Gemini Live will generate questions dynamically.")
        self.transcript: List[str] = []
        self.asked_questions: Dict[str, dict] = {}
        self.non_serious_strikes = 0
        self.lock = Lock()
        logger.info(f"[SESSION] ✓ InterviewSession initialization complete")

    def _build_questions(self):
        from .generator import generate_interview_questions_with_ai
        logger.info(f"[SERVICE] Calling generate_interview_questions_with_ai with job_title='{self.job_title}'")
        questions = generate_interview_questions_with_ai(
            self.job_title,
            self.job_description,
            self.required_skills
        )
        logger.info(f"[SERVICE] ✓ Got {len(questions)} questions back from generator")
        for idx, q in enumerate(questions, 1):
            logger.info(f"  Q{idx}: [{q['id']}] {q['text'][:60]}... ({q.get('time_seconds', '?')}s)")
        return questions


class InterviewService:
    """In-memory interview session service. Suitable for MVP and tests.

    Persist to DB later using `packages/db` Prisma package.
    """

    def __init__(self):
        self._sessions: Dict[str, InterviewSession] = {}
        self._lock = Lock()

    def create_session(self, payload: StartInterviewRequest) -> InterviewSession:
        logger.info(f"[SERVICE] Creating new session with job_title='{payload.job_title}'")
        session = InterviewSession(payload)
        logger.info(f"[SERVICE] ✓ InterviewSession initialized with {len(session.questions)} questions")
        with self._lock:
            self._sessions[session.id] = session
        logger.info(f"[SERVICE] ✓ Session stored in registry. Total sessions: {len(self._sessions)}")
        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        return self._sessions.get(session_id)

    def next_question(self, session_id: str):
        session = self.get_session(session_id)
        if not session:
            logger.warning(f"[SERVICE] next_question() called but session_id '{session_id}' not found")
            return None
        with session.lock:
            if not session.questions:
                logger.warning(f"[SERVICE] next_question() called but no questions left in queue")
                return None
            q = session.questions.pop(0)
            session.asked_questions[q["id"]] = q
            remaining = len(session.questions)
            logger.info(f"[SERVICE] next_question() returning: [{q['id']}] {q['text'][:60]}... ({remaining} questions remaining)")
            return q

    def record_question(self, session_id: str, question: dict) -> bool:
        session = self.get_session(session_id)
        if not session:
            return False
        with session.lock:
            session.asked_questions[question["id"]] = question
        return True

    def get_asked_question(self, session_id: str, question_id: str) -> Optional[dict]:
        session = self.get_session(session_id)
        if not session:
            return None
        with session.lock:
            return session.asked_questions.get(question_id)

    def add_non_serious_strike(self, session_id: str) -> Optional[int]:
        session = self.get_session(session_id)
        if not session:
            return None
        with session.lock:
            session.non_serious_strikes += 1
            return session.non_serious_strikes

    def reset_non_serious_strikes(self, session_id: str) -> bool:
        session = self.get_session(session_id)
        if not session:
            return False
        with session.lock:
            session.non_serious_strikes = 0
        return True

    def submit_answer(self, session_id: str, question_id: str, answer: str) -> bool:
        session = self.get_session(session_id)
        if not session:
            return False
        with session.lock:
            question = session.asked_questions.get(question_id)
            if question:
                session.transcript.append(f"Interviewer: {question['text']}")
            else:
                session.transcript.append(f"Interviewer: Question {question_id}")
            session.transcript.append(f"Candidate: {answer}")
        return True

    def append_transcript(self, session_id: str, line: str) -> bool:
        session = self.get_session(session_id)
        if not session:
            return False
        with session.lock:
            speaker = line.split(":", 1)[0]
            if session.transcript and session.transcript[-1].startswith(f"{speaker}:"):
                session.transcript[-1] = f"{session.transcript[-1]} {line.split(':', 1)[1].strip()}"
            else:
                session.transcript.append(line)
        return True

    def stop_session(self, session_id: str) -> Optional[InterviewSession]:
        with self._lock:
            return self._sessions.pop(session_id, None)


# Singleton service for use by router
service = InterviewService()
