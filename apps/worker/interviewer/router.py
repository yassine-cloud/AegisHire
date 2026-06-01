from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import uuid

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi import BackgroundTasks
from typing import Any
import logging

from .schemas import (
    StartInterviewRequest,
    StartInterviewResponse,
    NextQuestionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    StopInterviewResponse,
)
from .service import service
from reporting import save_phase_report

from config import get_settings

logger = logging.getLogger("worker.interviewer")

router = APIRouter(prefix="/interview", tags=["interview"])

LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
END_INTERVIEW_FLAG_RE = re.compile(
    r"\bEND_INTERVIEW\s*:\s*(FINISHED|NOT_SERIOUS)\b",
    re.IGNORECASE,
)
PARTIAL_END_INTERVIEW_FLAG_RE = re.compile(r"\s*END_INTERVIEW\s*:?\s*$", re.IGNORECASE)
NOT_SERIOUS_ANSWER_RE = re.compile(
    r"\b("
    r"not\s+serious|here\s+for\s+fun|just\s+joking|joking\s+around|"
    r"messing\s+around|wasting\s+time|don't\s+care|do\s+not\s+care|"
    r"nonsense|blah|idk|no\s+body|nobody"
    r")\b",
    re.IGNORECASE,
)
LOW_EFFORT_ANSWER_RE = re.compile(
    r"^\s*(idk|i\s+don't\s+know|i\s+do\s+not\s+know|no|nah|nothing|none|nope|no\s+body|nobody)\s*[.!?]?\s*$",
    re.IGNORECASE,
)
CLARIFICATION_REQUEST_RE = re.compile(
    r"\b("
    r"explain|clarify|rephrase|repeat|simplify|what\s+do\s+you\s+mean|"
    r"don't\s+understand|do\s+not\s+understand"
    r")\b",
    re.IGNORECASE,
)


def _is_deadline_expired(exc: Exception) -> bool:
    return "Deadline expired before operation could complete" in str(exc)


def _extract_end_interview_flag(text: str) -> tuple[str, str | None]:
    match = END_INTERVIEW_FLAG_RE.search(text)
    if not match:
        return text.strip(), None
    cleaned = END_INTERVIEW_FLAG_RE.sub("", text).strip()
    return cleaned, match.group(1).upper()


def _split_partial_end_interview_flag(text: str) -> tuple[str, str | None]:
    match = PARTIAL_END_INTERVIEW_FLAG_RE.search(text)
    if not match:
        return text.strip(), None
    return text[: match.start()].strip(), match.group(0).strip()


def _is_expected_stop(exc: BaseException) -> bool:
    if isinstance(exc, asyncio.CancelledError):
        return True
    return isinstance(exc, WebSocketDisconnect)


def _get_gemini_key() -> str | None:
    try:
        settings = get_settings()
        if settings.gemini_api_key:
            return settings.gemini_api_key
    except Exception:
        pass
    return os.getenv("GEMINI_API_KEY")


def _build_live_config(payload: dict[str, Any], transcript: list[str] | None = None) -> dict[str, Any]:
    job_title = payload.get("job_title") or "the open role"
    job_description = payload.get("job_description") or "No job description provided."
    required_skills = payload.get("required_skills") or []
    skills_text = ", ".join(required_skills) if required_skills else "No required skills provided."
    transcript_text = "\n".join(transcript or [])
    next_step_instruction = (
        "\n\nConversation so far:\n"
        f"{transcript_text}\n\n"
        "Continue from the latest candidate answer. Do not restart the interview or repeat questions "
        "that have already been answered. Ask the next best follow-up or move to a new relevant topic."
        if transcript_text
        else "\n\nStart by greeting the candidate and asking the first interview question."
    )

    return {
        "system_instruction": (
            "You are an empathetic technical interviewer conducting a live voice interview. "
            "Keep responses brief and natural. Ask one question at a time, wait for the candidate, "
            "then ask a relevant follow-up or move to the next topic. Do not ask coding whiteboard "
            "questions. Focus on experience, trade-offs, system design, and practical understanding.\n\n"
            "You control when the interview ends. End it only in one of these cases:\n"
            "1. FINISHED: you have asked enough HR and technical questions for this role, the candidate "
            "has answered the final question, and you are not asking another question.\n"
            "2. NOT_SERIOUS: the candidate is repeatedly joking, refusing, giving nonsense answers, "
            "or clearly not participating seriously after you have tried to redirect once.\n"
            "When ending, give a short natural closing sentence and append the exact control flag "
            "END_INTERVIEW: FINISHED or END_INTERVIEW: NOT_SERIOUS. Do not use this flag for ordinary "
            "goodbyes from the candidate unless one of the two conditions is met.\n\n"
            f"Role: {job_title}\n"
            f"Job description: {job_description}\n"
            f"Required skills: {skills_text}\n\n"
            f"{next_step_instruction}"
        ),
        "response_modalities": ["AUDIO"],
        "input_audio_transcription": {},
        "output_audio_transcription": {},
        "proactivity": {"proactive_audio": True},
    }


def _extract_json_object(text: str) -> dict[str, Any]:
    raw_text = text.strip()
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_text, re.DOTALL)
    if match:
        raw_text = match.group(1).strip()
    return json.loads(raw_text)


def _is_non_serious_answer(answer: str) -> bool:
    normalized = answer.strip()
    if not normalized:
        return True
    if NOT_SERIOUS_ANSWER_RE.search(normalized):
        return True
    return bool(LOW_EFFORT_ANSWER_RE.match(normalized))


def _is_clarification_request(answer: str) -> bool:
    normalized = answer.strip()
    if not normalized:
        return False
    return bool(CLARIFICATION_REQUEST_RE.search(normalized))


def _end_text_interview(session_id: str, end_reason: str, message: str) -> SubmitAnswerResponse:
    service.append_transcript(session_id, f"Interviewer: {message}")
    stopped_session = service.stop_session(session_id)
    final_transcript = stopped_session.transcript if stopped_session else []
    summary = _generate_summary_with_llm(final_transcript)
    review = _generate_review_with_llm(final_transcript)
    report_id = None
    if stopped_session:
        report_id = _save_interview_report(
            stopped_session,
            end_reason=end_reason,
            summary=summary,
            review=review,
        )
    return SubmitAnswerResponse(
        status="ended",
        end_reason=end_reason,
        message=message,
        transcript=final_transcript,
        summary=summary,
        review=review,
        report_id=report_id,
    )


def _build_redirect_question(session_id: str, original_question: dict | None) -> SubmitAnswerResponse:
    sess = service.get_session(session_id)
    transcript = list(sess.transcript) if sess else []
    original_text = (
        original_question.get("text")
        if original_question
        else "Could you answer the interview question with a serious, role-relevant example?"
    )
    question = {
        "id": f"redirect-{uuid.uuid4().hex[:8]}",
        "text": (
            "Let's keep this interview focused. Please answer seriously: "
            f"{original_text}"
        ),
        "time_seconds": int(
            (original_question or {}).get(
                "time_seconds",
                sess.default_question_time_seconds if sess else 60,
            )
        ),
    }
    service.record_question(session_id, question)
    return SubmitAnswerResponse(
        status="ok",
        question=question,
        message="Please keep the interview serious.",
        transcript=transcript,
    )


def _build_clarification_question(session_id: str, original_question: dict | None) -> SubmitAnswerResponse:
    sess = service.get_session(session_id)
    transcript = list(sess.transcript) if sess else []
    original_text = (
        original_question.get("text")
        if original_question
        else "Could you describe your approach using a concrete example from your experience?"
    )
    question = {
        "id": f"clarify-{uuid.uuid4().hex[:8]}",
        "text": (
            "In simpler terms, I am asking about your practical approach. "
            f"Please answer this version: {original_text}"
        ),
        "time_seconds": int(
            (original_question or {}).get(
                "time_seconds",
                sess.default_question_time_seconds if sess else 60,
            )
        ),
    }
    service.record_question(session_id, question)
    return SubmitAnswerResponse(
        status="ok",
        question=question,
        message="Question clarified.",
        transcript=transcript,
    )


def _fallback_text_turn(session_id: str, message: str | None = None) -> SubmitAnswerResponse:
    q = service.next_question(session_id)
    sess = service.get_session(session_id)
    transcript = list(sess.transcript) if sess else []
    if q is None:
        stopped_session = service.stop_session(session_id)
        final_transcript = stopped_session.transcript if stopped_session else transcript
        summary = _generate_summary_with_llm(final_transcript)
        review = _generate_review_with_llm(final_transcript)
        report_id = None
        if stopped_session:
            report_id = _save_interview_report(
                stopped_session,
                end_reason="FINISHED",
                summary=summary,
                review=review,
            )
        return SubmitAnswerResponse(
            status="ended",
            end_reason="FINISHED",
            message=message or "No more questions.",
            transcript=final_transcript,
            summary=summary,
            review=review,
            report_id=report_id,
        )
    return SubmitAnswerResponse(
        status="ok",
        question=q,
        message=message,
        transcript=transcript,
    )


def _generate_next_text_turn(session_id: str) -> SubmitAnswerResponse:
    sess = service.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    with sess.lock:
        transcript = list(sess.transcript)
        remaining_questions = list(sess.questions)
        non_serious_strikes = sess.non_serious_strikes

    gemini_key = _get_gemini_key()
    if not gemini_key:
        return _fallback_text_turn(session_id, "GEMINI_API_KEY is not configured; using queued questions.")

    try:
        from google import genai

        skills_text = ", ".join(sess.required_skills) if sess.required_skills else "No required skills provided."
        remaining_text = "\n".join(
            f"- {q.get('id')}: {q.get('text')} ({q.get('time_seconds', sess.default_question_time_seconds)}s)"
            for q in remaining_questions
        ) or "No queued questions remain."
        prompt = (
            "You are an empathetic technical interviewer conducting a text interview. "
            "Use the full conversation so far, especially the candidate's latest answer, to choose the next turn. "
            "Ask one concise question at a time. Prefer a relevant follow-up when the answer creates a useful path; "
            "otherwise move to the next important topic for the role. If the latest candidate answer asks you to "
            "explain, clarify, rephrase, or repeat the question, clarify the same question instead of moving to "
            "a new topic. Do not ask coding whiteboard questions.\n\n"
            "End the interview only in one of these cases:\n"
            "1. FINISHED: enough HR and technical questions have been answered for this role.\n"
            "2. NOT_SERIOUS: the candidate is repeatedly joking, refusing, giving nonsense answers, or clearly not "
            "participating seriously after one redirect opportunity.\n\n"
            f"Current non-serious strike count before this turn: {non_serious_strikes}.\n\n"
            f"Role: {sess.job_title}\n"
            f"Job description: {sess.job_description}\n"
            f"Required skills: {skills_text}\n\n"
            "Conversation so far:\n"
            f"{chr(10).join(transcript)}\n\n"
            "Queued questions you may reuse or adapt:\n"
            f"{remaining_text}\n\n"
            "Return raw JSON only with this schema:\n"
            '{ "end_reason": null | "FINISHED" | "NOT_SERIOUS", '
            '"message": "short interviewer text when ending or redirecting", '
            '"question": null | { "text": "next question", "time_seconds": 90 } }'
        )

        settings = get_settings()
        model_name = settings.llm_model_name or "gemini-2.5-flash"
        client = genai.Client(api_key=gemini_key)
        response = client.models.generate_content(model=model_name, contents=prompt)
        data = _extract_json_object(getattr(response, "text", "") or "")

        end_reason = data.get("end_reason")
        if end_reason in {"FINISHED", "NOT_SERIOUS"}:
            message = (data.get("message") or "").strip() or "Interview complete."
            return _end_text_interview(session_id, end_reason, message)

        question = data.get("question") or {}
        text = (question.get("text") or "").strip()
        if not text:
            return _fallback_text_turn(session_id, "AI did not return a next question; using queued questions.")

        next_question = {
            "id": f"ai-text-{uuid.uuid4().hex[:8]}",
            "text": text,
            "time_seconds": int(question.get("time_seconds") or sess.default_question_time_seconds or 60),
        }
        service.record_question(session_id, next_question)
        current_session = service.get_session(session_id)
        return SubmitAnswerResponse(
            status="ok",
            question=next_question,
            message=(data.get("message") or None),
            transcript=list(current_session.transcript) if current_session else transcript,
        )
    except Exception as exc:
        logger.warning("[TEXT] Adaptive text turn failed; falling back to queued question: %s", exc, exc_info=True)
        return _fallback_text_turn(session_id, "Adaptive text turn failed; using queued questions.")


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(payload: StartInterviewRequest):
    logger.info(f"[ROUTER] POST /interview/start called with job_title='{payload.job_title}'")
    session = service.create_session(payload)
    logger.info(f"[ROUTER] ✓ Session created: id={session.id}, questions_count={len(session.questions)}")
    return StartInterviewResponse(session_id=session.id)


@router.websocket("/live")
async def live_interview(websocket: WebSocket):
    await websocket.accept()

    gemini_key = _get_gemini_key()
    if not gemini_key:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY is not configured."})
        await websocket.close(code=1011)
        return

    try:
        start_payload = await websocket.receive_json()
        if start_payload.get("type") != "start":
            await websocket.send_json({"type": "error", "message": "First message must be type=start."})
            await websocket.close(code=1008)
            return

        from google import genai

        live_session = None
        requested_session_id = start_payload.get("session_id")
        if requested_session_id:
            live_session = service.get_session(str(requested_session_id))

        if live_session is None:
            live_session = service.create_session(
                StartInterviewRequest(
                    job_title=start_payload.get("job_title") or "Live interview",
                    job_description=start_payload.get("job_description") or "No job description provided.",
                    required_skills=start_payload.get("required_skills") or [],
                    mode="live",
                    user_id=start_payload.get("user_id"),
                    candidate_id=start_payload.get("candidate_id"),
                    job_offer_id=start_payload.get("job_offer_id"),
                )
            )
        else:
            logger.info("[LIVE] Resuming live interview session=%s", live_session.id)

        model = start_payload.get("model") or os.getenv("INTERVIEW_LIVE_MODEL") or LIVE_MODEL
        client = genai.Client(api_key=gemini_key, http_options={"api_version": "v1alpha"})

        audio_queue: asyncio.Queue[dict[str, bytes | str]] = asyncio.Queue(maxsize=50)
        stop_event = asyncio.Event()
        pending_interviewer_control = ""
        end_interview_reason: str | None = None
        logger.info("[LIVE] Connecting to Gemini Live model=%s session=%s", model, live_session.id)

        async def browser_to_queue():
            while not stop_event.is_set():
                message = await websocket.receive_json()
                message_type = message.get("type")

                if message_type == "audio":
                    audio_base64 = message.get("data")
                    if audio_base64:
                        audio = {
                            "data": base64.b64decode(audio_base64),
                            "mime_type": "audio/pcm",
                        }
                        if audio_queue.full():
                            _ = audio_queue.get_nowait()
                        await audio_queue.put(audio)
                elif message_type == "stop":
                    stop_event.set()
                    break

        async def handle_gemini_response(response: Any):
            audio_data = getattr(response, "data", None)
            if audio_data:
                await websocket.send_json(
                    {
                        "type": "audio",
                        "data": base64.b64encode(audio_data).decode("ascii"),
                    }
                )
                return

            server_content = getattr(response, "server_content", None)
            if not server_content:
                return

            model_turn = getattr(server_content, "model_turn", None)
            if model_turn:
                for part in getattr(model_turn, "parts", []) or []:
                    inline_data = getattr(part, "inline_data", None)
                    if inline_data and getattr(inline_data, "data", None):
                        await websocket.send_json(
                            {
                                "type": "audio",
                                "data": base64.b64encode(inline_data.data).decode("ascii"),
                            }
                        )

            input_transcription = getattr(server_content, "input_transcription", None)
            if input_transcription:
                text = (getattr(input_transcription, "text", "") or "").strip()
                if text:
                    line = f"Candidate: {text}"
                    service.append_transcript(live_session.id, line)
                    await websocket.send_json({"type": "transcript", "speaker": "Candidate", "text": text})

            output_transcription = getattr(server_content, "output_transcription", None)
            if output_transcription:
                text = (getattr(output_transcription, "text", "") or "").strip()
                if text:
                    nonlocal end_interview_reason, pending_interviewer_control
                    combined_text = f"{pending_interviewer_control} {text}".strip()
                    cleaned_text, end_reason = _extract_end_interview_flag(combined_text)
                    if end_reason:
                        pending_interviewer_control = ""
                    else:
                        cleaned_text, pending_control = _split_partial_end_interview_flag(combined_text)
                        pending_interviewer_control = pending_control or ""

                    if cleaned_text:
                        line = f"Interviewer: {cleaned_text}"
                        service.append_transcript(live_session.id, line)
                        await websocket.send_json(
                            {
                                "type": "transcript",
                                "speaker": "Interviewer",
                                "text": cleaned_text,
                            }
                        )
                    if end_reason:
                        end_interview_reason = end_reason
                        await websocket.send_json(
                            {
                                "type": "status",
                                "message": f"Interview ended by AI flag: {end_reason}. Preparing summary.",
                            }
                        )
                        stop_event.set()

        async def run_gemini_session():
            connected_once = False
            while not stop_event.is_set():
                try:
                    with live_session.lock:
                        transcript_snapshot = list(live_session.transcript)
                    config = _build_live_config(start_payload, transcript_snapshot)
                    async with client.aio.live.connect(model=model, config=config) as session:
                        if connected_once:
                            await websocket.send_json({"type": "status", "message": "Gemini Live reconnected."})
                        else:
                            await websocket.send_json(
                                {
                                    "type": "ready",
                                    "model": model,
                                    "session_id": live_session.id,
                                    "transcript": transcript_snapshot,
                                }
                            )
                            connected_once = True

                        async def send_audio():
                            while not stop_event.is_set():
                                audio = await audio_queue.get()
                                await session.send_realtime_input(audio=audio)

                        async def receive_audio():
                            while not stop_event.is_set():
                                turn = session.receive()
                                async for response in turn:
                                    await handle_gemini_response(response)

                        send_task = asyncio.create_task(send_audio())
                        receive_task = asyncio.create_task(receive_audio())
                        done, pending = await asyncio.wait(
                            {send_task, receive_task},
                            return_when=asyncio.FIRST_COMPLETED,
                        )

                        for task in pending:
                            task.cancel()
                        for task in done:
                            task.result()
                except Exception as exc:
                    if stop_event.is_set() or _is_expected_stop(exc):
                        break
                    if not _is_deadline_expired(exc):
                        raise
                    logger.warning("[LIVE] Gemini deadline expired; reconnecting Live session")
                    await websocket.send_json(
                        {
                            "type": "status",
                            "message": "Gemini Live timed out; reconnecting.",
                        }
                    )
                    await asyncio.sleep(0.5)

        browser_task = asyncio.create_task(browser_to_queue())
        gemini_task = asyncio.create_task(run_gemini_session())
        done, pending = await asyncio.wait(
            {browser_task, gemini_task},
            return_when=asyncio.FIRST_COMPLETED,
        )

        stop_event.set()
        for task in pending:
            task.cancel()
        for task in done:
            task.result()

        stopped_session = service.stop_session(live_session.id)
        if stopped_session:
            summary = _generate_summary_with_llm(stopped_session.transcript)
            review = _generate_review_with_llm(stopped_session.transcript)
            report_id = _save_interview_report(
                stopped_session,
                end_reason=end_interview_reason,
                summary=summary,
                review=review,
            )
            await websocket.send_json(
                {
                    "type": "stopped",
                    "session_id": live_session.id,
                    "end_reason": end_interview_reason,
                    "transcript": stopped_session.transcript,
                    "summary": summary,
                    "review": review,
                    "report_id": report_id,
                }
            )

    except WebSocketDisconnect:
        logger.info("[LIVE] Browser disconnected from live interview")
    except Exception as exc:
        logger.error("[LIVE] Live interview failed: %s", exc, exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.get("/{session_id}")
async def get_session_status(session_id: str):
    sess = service.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")
    return {
        "session_id": sess.id,
        "job_title": sess.job_title,
        "job_description": sess.job_description,
        "remaining_questions": len(sess.questions),
    }


@router.post("/{session_id}/question", response_model=NextQuestionResponse)
async def next_question(session_id: str):
    logger.info(f"[ROUTER] POST /interview/{session_id}/question called")
    q = service.next_question(session_id)
    if q is None:
        logger.error(f"[ROUTER] ✗ No question found for session_id={session_id}")
        raise HTTPException(status_code=404, detail="NO_MORE_QUESTIONS")
    logger.info(f"[ROUTER] ✓ Returning question: [{q['id']}]")
    return NextQuestionResponse(question=q)


@router.post("/{session_id}/answer", response_model=SubmitAnswerResponse)
async def submit_answer(session_id: str, payload: SubmitAnswerRequest):
    original_question = service.get_asked_question(session_id, payload.question_id)
    ok = service.submit_answer(session_id, payload.question_id, payload.answer_text)
    if not ok:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    if _is_non_serious_answer(payload.answer_text):
        strikes = service.add_non_serious_strike(session_id)
        if strikes is None:
            raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")
        if strikes >= 2:
            return _end_text_interview(
                session_id,
                "NOT_SERIOUS",
                "I am ending this interview because the answers are not serious enough to continue.",
            )
        return _build_redirect_question(session_id, original_question)

    service.reset_non_serious_strikes(session_id)

    if _is_clarification_request(payload.answer_text):
        return _build_clarification_question(session_id, original_question)

    return _generate_next_text_turn(session_id)


def _generate_summary_with_llm(transcript: list[str]) -> str:
    settings = get_settings()
    # Try Gemini if configured; otherwise return basic summary
    try:
        if settings.llm_provider == "gemini":
            try:
                from google import genai

                client = genai.Client()
                prompt = (
                    "You are an assistant reviewing a hiring interview transcript. Use the full transcript, "
                    "not only the final messages. Provide a structured summary with: "
                    "1) main topics 2) strengths 3) weaknesses 4) recommended next steps "
                    "5) notable evidence from the candidate's own answers.\n\n"
                    + "\n".join(transcript)
                )
                resp = client.models.generate_content(model=settings.llm_model_name, contents=prompt)
                return getattr(resp, "text", None) or ""
            except Exception as exc:
                logger.warning("[SUMMARY] LLM summary failed: %s", exc)
    except Exception:
        pass
    # Fallback (simple heuristic summary)
    if not transcript:
        return "No transcript available."
    return (
        "LLM summary was not available. Full transcript for manual review:\n\n"
        + "\n".join(transcript)
    )


def _generate_review_with_llm(transcript: list[str]) -> str:
    settings = get_settings()
    try:
        if settings.llm_provider == "gemini":
            try:
                from google import genai

                client = genai.Client()
                prompt = (
                    "You are reviewing a technical interview for hiring signal. Produce an analytical review with: "
                    "overall recommendation, communication quality, technical depth, practical reasoning, "
                    "risk signals, and concrete evidence from the transcript. Keep it concise and structured.\n\n"
                    + "\n".join(transcript)
                )
                resp = client.models.generate_content(model=settings.llm_model_name, contents=prompt)
                return getattr(resp, "text", None) or ""
            except Exception as exc:
                logger.warning("[REVIEW] LLM review failed: %s", exc)
    except Exception:
        pass
    if not transcript:
        return "No transcript available for review."
    return "LLM review was not available. Manual review required using the transcript evidence."


def _save_interview_report(session, *, end_reason: str | None, summary: str, review: str) -> str | None:
    try:
        return save_phase_report(
            candidate_id=getattr(session, "candidate_id", None),
            job_offer_id=getattr(session, "job_offer_id", None),
            phase="interview",
            report={
                "session_id": session.id,
                "mode": session.mode,
                "job_title": session.job_title,
                "job_description": session.job_description,
                "required_skills": session.required_skills,
                "end_reason": end_reason or "STOPPED",
                "summary": summary,
                "review": review,
                "transcript": session.transcript,
            },
        )
    except Exception as exc:
        logger.error("[REPORTING] Failed to save interview report: %s", exc, exc_info=True)
        return None


@router.post("/{session_id}/stop", response_model=StopInterviewResponse)
async def stop_session(session_id: str, background_tasks: BackgroundTasks):
    sess = service.stop_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    transcript = sess.transcript

    # Generate summary synchronously (fast path) — if heavy, move to background
    summary = _generate_summary_with_llm(transcript)
    review = _generate_review_with_llm(transcript)
    report_id = _save_interview_report(
        sess,
        end_reason="STOPPED",
        summary=summary,
        review=review,
    )

    return StopInterviewResponse(
        session_id=session_id,
        transcript=transcript,
        summary=summary,
        review=review,
        report_id=report_id,
    )
