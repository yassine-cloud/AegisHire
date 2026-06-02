#!/usr/bin/env python
"""Test script to debug interviewer AI question generation."""

import sys
import os
import logging

# Set up logging to see all messages
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)

# Load environment
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), ".env")
print(f"\n{'='*80}")
print(f"Loading .env from: {env_path}")
print(f"{'='*80}\n")
load_dotenv(env_path)

# Import and test
from interviewer.generator import generate_interview_questions_with_ai

print(f"\n{'='*80}")
print("TESTING AI QUESTION GENERATION")
print(f"{'='*80}\n")

questions = generate_interview_questions_with_ai(
    job_title="Senior Full-Stack Engineer",
    job_description="Build microservices with React, Node.js, NestJS, PostgreSQL, Redis",
    skills=["React", "Next.js", "Node.js", "NestJS", "PostgreSQL", "Redis"]
)

print(f"\n{'='*80}")
print(f"RESULT: Got {len(questions)} questions")
print(f"{'='*80}\n")

for idx, q in enumerate(questions, 1):
    print(f"Q{idx} [{q['id']}]:")
    print(f"  Text: {q['text']}")
    print(f"  Time: {q['time_seconds']}s")
    if q['id'].startswith('fallback'):
        print(f"  ⚠ HARDCODED FALLBACK")
    else:
        print(f"  ✓ AI-GENERATED")
    print()
