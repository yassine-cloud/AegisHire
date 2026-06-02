("""Live interviewer using Gemini Live API.

Adapted from a standalone example to integrate with the worker service.

Run locally for quick testing:
	python -m apps.worker.interviewer.interviewer

Configuration:
- Set GEMINI_API_KEY in environment or configure LLM provider in apps/worker/.env
- Optional overrides: INTERVIEW_LIVE_MODEL, INTERVIEW_REPORT_MODEL

""")

from __future__ import annotations

import asyncio
import os
import sys
import traceback
import time
from typing import Optional

import pyaudio
from google import genai
from fpdf import FPDF

try:
	from config import get_settings
except ImportError:
	from ..config import get_settings


# Audio settings
FORMAT = pyaudio.paInt16
CHANNELS = 1
INPUT_RATE = 16000
OUTPUT_RATE = 24000
CHUNK_SIZE = 1024


def _load_settings():
	try:
		settings = get_settings()
	except Exception:
		settings = None
	return settings


def generate_pdf_report(transcript_lines: list[str]) -> None:
	if not transcript_lines:
		print("\n[REPORT] No conversation recorded. Skipping PDF.")
		return

	print("\n[REPORT] Generating session summary…")
	full_transcript = "\n".join(transcript_lines)
	prompt = (
		"You are an expert interviewer. Review the following interview transcript and provide a structured summary including:\n"
		"1. Main Topics Discussed\n2. Candidate Strengths\n3. Improvement Areas\n4. Recommended Next Steps\n\n"
		f"Transcript:\n{full_transcript}"
	)

	# Try to call the LLM for a richer summary; fallback to raw transcript
	try:
		settings = _load_settings()
		report_model = os.getenv("INTERVIEW_REPORT_MODEL") or (settings.llm_model_name if settings else None) or "gemini-2.0-flash"

		client = genai.Client()
		resp = client.models.generate_content(model=report_model, contents=prompt)
		summary = getattr(resp, "text", None) or "(LLM returned no summary)"
	except Exception as exc:
		print(f"[REPORT] LLM summary failed: {exc}")
		summary = "\n".join(transcript_lines[-20:])

	pdf = FPDF()
	pdf.add_page()
	pdf.set_font("Helvetica", style="B", size=16)
	pdf.cell(200, 10, text="Interview Review", new_x="LMARGIN", new_y="NEXT", align="C")
	pdf.ln(10)
	pdf.set_font("Helvetica", size=12)
	pdf.multi_cell(0, 8, text=summary)
	out_path = f"interview_review_{int(time.time())}.pdf"
	pdf.output(out_path)
	print(f"[REPORT] Saved → {out_path}")


class LiveInterviewer:
	def __init__(self, live_model: Optional[str] = None):
		self.session = None
		self.audio_stream = None
		self.out_queue: asyncio.Queue = asyncio.Queue(maxsize=10)
		self.play_queue: asyncio.Queue = asyncio.Queue()
		self.transcript: list[str] = []
		self.ai_speaking = False
		self.live_model = live_model

	async def listen_audio(self):
		p = pyaudio.PyAudio()
		mic_info = p.get_default_input_device_info()
		self.audio_stream = await asyncio.to_thread(
			p.open,
			format=FORMAT,
			channels=CHANNELS,
			rate=INPUT_RATE,
			input=True,
			input_device_index=mic_info.get("index"),
			frames_per_buffer=CHUNK_SIZE,
		)
		while True:
			data = await asyncio.to_thread(self.audio_stream.read, CHUNK_SIZE, exception_on_overflow=False)
			if not self.ai_speaking:
				await self.out_queue.put({"data": data, "mime_type": "audio/pcm"})

	async def send_realtime(self):
		while True:
			msg = await self.out_queue.get()
			await self.session.send_realtime_input(audio=msg)

	async def receive_audio(self):
		async for response in self.session.receive():
			server_content = getattr(response, "server_content", None)
			if not server_content:
				# Some older SDK variants put audio on response.data
				if getattr(response, "data", None):
					await self.play_queue.put(response.data)
				continue

			# Play audio parts if available
			if getattr(server_content, "model_turn", None):
				for part in server_content.model_turn.parts:
					if getattr(part, "inline_data", None):
						await self.play_queue.put(part.inline_data.data)

			# Capture transcripts
			if getattr(server_content, "input_transcription", None):
				text = server_content.input_transcription.text.strip()
				if text:
					self.transcript.append(f"Candidate: {text}")
					print(f"\nYou: {text}")

			if getattr(server_content, "output_transcription", None):
				text = server_content.output_transcription.text.strip()
				if text:
					self.transcript.append(f"Interviewer: {text}")
					print(f"\nInterviewer: {text}")

			# If model produced audio chunks they will be drained by play loop

			# When model turn completes, allow mic again
			self.ai_speaking = False

	async def play_audio(self):
		p = pyaudio.PyAudio()
		speaker = await asyncio.to_thread(p.open, format=FORMAT, channels=CHANNELS, rate=OUTPUT_RATE, output=True)
		while True:
			chunk = await self.play_queue.get()
			self.ai_speaking = True
			await asyncio.to_thread(speaker.write, chunk)
			# small pause to let queue fill/drain
			if self.play_queue.empty():
				self.ai_speaking = False

	async def run(self):
		settings = _load_settings()

		# Ensure GEMINI_API_KEY available if using Gemini
		if settings and getattr(settings, "llm_provider", None) == "gemini":
			gemini_key = getattr(settings, "gemini_api_key", None)
			if gemini_key:
				os.environ.setdefault("GEMINI_API_KEY", gemini_key)

		live_model = self.live_model or os.getenv("INTERVIEW_LIVE_MODEL") or (settings.llm_model_name if settings else None) or "gemini-2.5-flash-native-audio-preview-12-2025"

		client = genai.Client()

		config = {
			"system_instruction": (
				"You are an empathetic technical interviewer. Ask concise HR and technical questions, wait for the candidate answer, then move on."
			),
			"response_modalities": ["AUDIO"],
			"input_audio_transcription": {},
			"output_audio_transcription": {},
		}

		print(f"[API] Connecting to live model: {live_model} …")
		try:
			async with client.aio.live.connect(model=live_model, config=config) as session:
				self.session = session
				print("[API] Connected. Start speaking (Ctrl+C to stop).")

				async with asyncio.TaskGroup() as tg:
					tg.create_task(self.listen_audio())
					tg.create_task(self.send_realtime())
					tg.create_task(self.receive_audio())
					tg.create_task(self.play_audio())

		except KeyboardInterrupt:
			pass
		except Exception as exc:
			print(f"[ERROR] {exc}")
			traceback.print_exc()
		finally:
			if self.audio_stream:
				try:
					self.audio_stream.close()
				except Exception:
					pass
			generate_pdf_report(self.transcript)


async def main():
	interviewer = LiveInterviewer()
	await interviewer.run()


if __name__ == "__main__":
	# Windows selector policy for asyncio
	if os.name == "nt":
		asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
	try:
		asyncio.run(main())
	except KeyboardInterrupt:
		pass

