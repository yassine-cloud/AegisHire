# 🧠 AegisHire — AI-Powered Technical Hiring & Career Intelligence Platform

---

## 1️⃣ Executive Vision

AegisHire is a **multi-agent AI platform powered by MCP Server**, designed to serve both sides of the hiring equation:

**For candidates**, it acts as a personal career mirror — evaluate your real technical profile, discover roles that match your actual skills, and walk into any interview prepared.

**For companies**, it acts as a hiring intelligence layer — analyze candidates deeply, generate adaptive interviews, and make explainable, bias-aware hiring decisions.

> This is not just an interview app. This is an **AI-powered Technical Hiring Infrastructure** — built for everyone in the hiring funnel.

Core capabilities:

- Evaluate developer candidates from real Git repositories, resumes, and LinkedIn profiles
- Build a personalized Developer Skill Graph per candidate
- Match candidates to job roles based on deep skill compatibility
- Generate adaptive, personalized interview questions
- Detect AI-assisted cheating during live interviews
- Provide explainable, bias-aware scoring for both candidates and HR teams
- Maintain full audit transparency

---

## 2️⃣ Core Functional Domains

### 🔹 A. Candidate Intelligence Engine

The foundation of the platform. Works for both self-evaluating candidates and company-assessed applicants.

The system accepts:

- GitHub / GitLab profile (repositories, commit history)
- Resume (PDF or text)
- LinkedIn profile URL

From these, it extracts and cross-references:

- Tech stack and depth of experience per technology
- Code complexity and architecture style
- Commit patterns and consistency
- Testing practices and security awareness
- Stated experience vs. demonstrated experience (resume vs. repo gap analysis)

All of this is compiled into a **Developer Skill Graph** — a structured, weighted map of what the candidate actually knows and where the gaps are.

---

### 🔹 B. Role Matching & Recommendation System

A candidate-facing feature that turns the Skill Graph into actionable career intelligence.

**Matching flow:**

1. Candidate submits their profile (repos + resume + LinkedIn)
2. System builds their Skill Graph
3. Candidate either:
   - Browses available roles and gets a **compatibility score** (0–100%) per role, or
   - Pastes a specific job description to get an instant match analysis

**If the compatibility score is below a defined threshold:**

The system does not just say "you're not a fit." It generates a **Gap Report** that explains:

- Which required skills are missing or underdeveloped
- How significant each gap is relative to the role
- Concrete, prioritized recommendations to close those gaps (specific technologies, project types, learning paths)

This turns rejection into a roadmap.

---

### 🔹 C. Live AI Interview System

Activated once a candidate is invited to an interview — either self-initiated (practice mode) or by a company.

#### 1️⃣ Smart Code Editor

- Monitored typing behavior and keystroke rhythm
- Copy-paste detection
- AI-style pattern detection (LLM fingerprinting heuristics)
- Suspicious latency analysis

Flags (probabilistic, never binary):

- Possible AI-generated answers
- Possible plagiarism
- External assistance patterns

All flags contribute to a **Risk Probability Index (0–100%)** — never a hard pass/fail verdict.

---

#### 2️⃣ Voice & Meeting Monitoring _(Enterprise tier / explicit consent required)_

Using:

- Whisper (speech-to-text)
- Voice analysis tools
- Behavioral signals

Detects:

- Long unnatural pauses
- Voice switching
- Patterns consistent with reading from an external source
- Unusual keystroke rhythm during spoken responses

⚠ This module requires explicit candidate consent and is only available under enterprise plans. Legal compliance (GDPR and regional regulations) must be enforced before activation.

---

### 🔹 D. HR Intelligence Dashboard _(Company-facing)_

Companies using AegisHire can:

- Configure AI strictness level per interview session
- View each candidate's technical radar chart and Skill Graph
- Access the cheating Risk Probability Index with full reasoning
- Compare candidates side by side
- Browse historical interviews and audit logs
- Access AI-generated explanations for every score and decision

---

### 🔹 E. Candidate Self-Assessment Mode _(Individual-facing)_

Any user — not just company-referred candidates — can:

- Connect their GitHub/GitLab and upload their resume
- Receive a full Skill Graph and career snapshot
- Browse role recommendations matched to their profile
- Run a compatibility check against any job description
- Enter a practice interview to self-evaluate before a real one
- Track skill progression over time

This mode is the key differentiator from traditional HR-only platforms. The candidate owns their data and uses it to grow.

---

## 3️⃣ MCP Multi-Agent Architecture

MCP Server acts as the orchestration layer across all agents.

### 🎯 Core Agents

#### 1️⃣ Repository Analysis Agent

- Parses Git repos and extracts metadata
- Generates skill graph nodes (Neo4j)
- Detects tech stack, architecture patterns, testing habits, security signals

#### 2️⃣ Profile Aggregation Agent _(new)_

- Parses resume (PDF/text) and LinkedIn data
- Cross-references stated skills against demonstrated skills from repos
- Identifies discrepancies and highlights them in the Skill Graph

#### 3️⃣ Role Matching Agent _(new)_

- Compares Skill Graph against role requirements
- Generates compatibility scores
- Produces Gap Reports with prioritized improvement recommendations

#### 4️⃣ Interview Generation Agent

- Generates adaptive, personalized questions based on the candidate's Skill Graph
- Targets real gaps identified from repos and profile
- Adjusts difficulty dynamically

#### 5️⃣ Live Monitoring Agent

- Monitors code editor behavior in real time
- Computes AI suspicion scoring and Risk Probability Index

#### 6️⃣ Voice & Behavior Agent _(Enterprise / consent-gated)_

- Speech transcription via Whisper
- Behavioral anomaly detection

#### 7️⃣ Audit Transparency Agent

- Logs all AI decisions and modifications
- Ensures every output is explainable and traceable

#### 8️⃣ Risk & Bias Evaluation Agent

- Monitors evaluations for demographic or pattern-based bias
- Generates fairness scores alongside technical scores

---

## 4️⃣ Technical Architecture

### 🔹 Backend Core

- **NestJS** → API Gateway
- **Python** → AI services
- Microservices architecture
- Load balancer

_Note: The Rust/RIG module has been removed as it was tied exclusively to the deprecated Runtime Patch Agent._

---

### 🔹 AI Framework

- **LangGraph** — agent state management and deterministic workflows
- **LangChain** — LLM chaining and tool use
- **Google ADK / AGNO** — additional orchestration options
- **CrewAI** — multi-agent coordination
- **LlamaIndex** — graph-based retrieval for Skill Graph queries
- **Haystack** — retrieval pipelines for resume and JD parsing

---

### 🔹 Data Layer

- **Neo4j** → Developer Skill Graph, Interview Knowledge Graph, Role Requirements Graph
- **PostgreSQL** → Transactional data (users, sessions, scores, plans)
- **Redis** → Real-time interview state
- **Object Storage** → Logs, recordings, uploaded resumes

---

### 🔹 LLM & AI Services

- **Code-specialized LLM** → Code evaluation
- **Whisper** → Speech transcription
- **Guardrails layer** → LLM output validation and safety

---

## 5️⃣ AI Cheating Detection — Critical Notes

Cheating detection is probabilistic, not deterministic. The system **cannot** reliably detect AI-generated code with certainty or confirm someone is reading from another screen. What it can do is detect anomalies and assign a weighted risk score.

**Rule:** All cheating-related outputs must use the **Risk Probability Index (0–100%)** — never a binary pass/fail verdict. Misusing this as a hard disqualifier creates legal exposure.

---

## 6️⃣ Business Model

| Plan              | Target User          | Key Features                                                             |
| ----------------- | -------------------- | ------------------------------------------------------------------------ |
| Free              | Individual candidate | Skill Graph, role matching, Gap Report                                   |
| Pro (Individual)  | Serious job seekers  | Practice interviews, progress tracking, LinkedIn analysis                |
| Starter (Company) | Small teams          | Repo analysis + adaptive interview generation                            |
| Enterprise        | Large orgs           | Voice monitoring, cheating detection, HR dashboard, candidate comparison |

---

## 7️⃣ Ethical & Legal Considerations

- **GDPR compliance** — data minimization, right to access, right to deletion
- **Candidate consent** — explicit opt-in for all monitoring features, especially voice/webcam
- **AI transparency** — every score comes with a human-readable explanation
- **Bias mitigation** — dedicated agent monitors for unfair evaluation patterns
- **Data ownership** — candidates in self-assessment mode own and control their data
- **No binary verdicts** — all AI outputs are probabilistic and advisory

---

## 8️⃣ Additional Engineering Concerns

### Explainability Layer

Every AI decision must surface a clear reason. Example:

> _"Compatibility score: 61/100 — Strong in Node.js and REST API design. Gaps identified in distributed systems, testing coverage, and Kubernetes. Recommended: build one microservices project with Docker/K8s and improve test coverage above 60%."_

Without this, the platform will not be trusted by either candidates or enterprises.

### Bias Detection

AI hiring systems can encode bias from training data. The Risk & Bias Evaluation Agent must run alongside every evaluation and flag statistically anomalous patterns.

### Adversarial Robustness

Candidates will attempt to game the system — inflated repos, fake commit history, AI-generated portfolio projects. The Profile Aggregation Agent must include authenticity heuristics (commit depth, code originality signals, timeline consistency).

### Cost Control

LLM API calls across a full candidate flow (repo analysis + resume parsing + question generation + live monitoring) can be expensive at scale. Required infrastructure: token usage tracking per session, tiered model routing (lightweight models for simple tasks, advanced models for reasoning-heavy tasks), and a caching layer for repeated skill graph queries.

---

## 9️⃣ Realistic Challenges

1. **Scope is large** — prioritization and phased delivery are critical
2. **Cheating detection is unreliable** — must always be framed probabilistically
3. **Legal complexity is high** — especially for voice/behavior monitoring across jurisdictions
4. **LLM cost can scale quickly** — cost controls are not optional
5. **Resume and LinkedIn parsing is messy** — real-world data is inconsistent and noisy
6. **Role matching quality depends on data** — requires a well-maintained role/skills taxonomy

---

## 🎯 V1 Recommended Scope

**Build:**

- Repository Analysis Agent
- Profile Aggregation Agent (resume parsing)
- Developer Skill Graph (Neo4j)
- Role Matching & Gap Report system
- Adaptive Interview Generation
- Candidate self-assessment dashboard

**Defer to V2:**

- Live Code Editor with basic anomaly scoring
- Voice & behavioral monitoring
- LinkedIn live integration (use manual input first)
- Advanced bias auditing
- Real-time enterprise org analytics

Build modular. Every agent should be independently deployable and replaceable.

---

## 🚀 Final Assessment

AegisHire, in its updated form, is a more complete and more defensible product than its original enterprise-only version. Opening the platform to individual candidates creates a two-sided marketplace dynamic — candidates want to use it to prepare, companies want to use it because candidates already have profiles on it. That flywheel is valuable.

The core is technically ambitious, ethically navigable if handled carefully, and commercially viable across both B2C and B2B segments.

> If executed well: a serious, differentiated platform in the AI hiring space.
