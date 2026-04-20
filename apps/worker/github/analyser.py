from datetime import datetime, timezone


SKILL_RULES: list[dict] = [
    {"skill": "React", "confidence_base": 0.85, "file_patterns": ["package.json"], "content_patterns": ["react", "jsx", "tsx"]},
    {"skill": "Next.js", "confidence_base": 0.9, "file_patterns": ["next.config.js", "next.config.ts"], "content_patterns": ["next"]},
    {"skill": "TypeScript", "confidence_base": 0.9, "file_patterns": ["tsconfig.json"], "content_patterns": ["typescript"]},
    {"skill": "Node.js", "confidence_base": 0.8, "file_patterns": ["package.json"], "content_patterns": ["express", "fastify", "node"]},
    {"skill": "FastAPI", "confidence_base": 0.9, "file_patterns": ["main.py", "app.py"], "content_patterns": ["fastapi"]},
    {"skill": "Docker", "confidence_base": 0.85, "file_patterns": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"], "content_patterns": ["docker"]},
    {"skill": "Testing", "confidence_base": 0.75, "file_patterns": ["jest.config.js", "jest.config.ts", "pytest.ini", "conftest.py", "vitest.config.ts"], "content_patterns": ["jest", "pytest", "vitest", "test"]},
    {"skill": "PostgreSQL", "confidence_base": 0.8, "file_patterns": [], "content_patterns": ["postgresql", "postgres", "prisma", "pg"]},
    {"skill": "Python", "confidence_base": 0.85, "file_patterns": ["requirements.txt", "pyproject.toml"], "content_patterns": ["python"]},
    {"skill": "CI/CD", "confidence_base": 0.9, "file_patterns": [".github/workflows", ".gitlab-ci.yml"], "content_patterns": ["github actions", "ci/cd"]},
    {"skill": "REST API", "confidence_base": 0.8, "file_patterns": [], "content_patterns": ["rest", "api", "endpoint", "router"]},
    {"skill": "GraphQL", "confidence_base": 0.85, "file_patterns": [], "content_patterns": ["graphql", "apollo"]},
]

ARCHITECTURE_PATTERNS = {
    "MVC": ["controllers", "models", "views", "controller.ts", "controller.py"],
    "Microservices": ["docker-compose", "services/", "gateway", "microservice"],
    "REST API": ["router", "routes", "endpoint", "api/"],
    "Monorepo": ["pnpm-workspace", "nx.json", "turbo.json", "lerna.json"],
    "Event-driven": ["rabbitmq", "kafka", "celery", "queue", "worker"],
}


def _match_files(file_tree: list[str], patterns: list[str]) -> list[str]:
    matched = []
    for pattern in patterns:
        for f in file_tree:
            if pattern.lower() in f.lower():
                matched.append(f)
                break
    return matched


def _normalize_languages(raw: dict[str, dict]) -> dict[str, int]:
    """Convert {repo: {lang: bytes}} to {lang: percentage}"""
    totals: dict[str, int] = {}
    for lang_map in raw.values():
        for lang, bytes_count in lang_map.items():
            totals[lang] = totals.get(lang, 0) + bytes_count
    grand_total = sum(totals.values()) or 1
    return {lang: round(bytes_count * 100 / grand_total) for lang, bytes_count in
            sorted(totals.items(), key=lambda x: x[1], reverse=True)}


def _commit_consistency(commits_per_repo: list[list[dict]]) -> float:
    """Score based on how spread out commits are across weeks."""
    all_weeks: set[str] = set()
    total = 0
    for commits in commits_per_repo:
        for c in commits:
            try:
                date_str = c["commit"]["author"]["date"]
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                week = dt.strftime("%Y-%W")
                all_weeks.add(week)
                total += 1
            except (KeyError, ValueError):
                continue
    if total == 0:
        return 0.0
    # more unique weeks relative to total commits = more consistent
    score = min(len(all_weeks) / max(total, 1) * 3, 1.0)
    return round(score, 2)


def _extract_skill_signals(all_files: list[str], all_readmes: list[str]) -> list[dict]:
    combined_readme = " ".join(all_readmes).lower()
    signals = []

    for rule in SKILL_RULES:
        evidence = []
        confidence = 0.0

        file_hits = _match_files(all_files, rule["file_patterns"])
        if file_hits:
            evidence.extend(file_hits[:2])
            confidence += rule["confidence_base"] * 0.6

        for pattern in rule["content_patterns"]:
            if pattern.lower() in combined_readme:
                evidence.append(f"{pattern} mentioned in README")
                confidence += rule["confidence_base"] * 0.4
                break

        if confidence > 0:
            signals.append({
                "skill": rule["skill"],
                "confidence": round(min(confidence, 1.0), 2),
                "evidence": evidence,
            })

    return sorted(signals, key=lambda x: x["confidence"], reverse=True)


def _extract_architecture_signals(all_files: list[str]) -> list[str]:
    found = []
    files_lower = [f.lower() for f in all_files]
    for arch, patterns in ARCHITECTURE_PATTERNS.items():
        for pattern in patterns:
            if any(pattern.lower() in f for f in files_lower):
                found.append(arch)
                break
    return found


def analyse(
    repos: list[dict],
    languages_per_repo: dict[str, dict],
    file_trees: dict[str, list[str]],
    readmes: dict[str, str],
    commits_per_repo: dict[str, list[dict]],
) -> dict:
    all_files = [f for files in file_trees.values() for f in files]
    all_readmes = list(readmes.values())

    return {
        "repos_analyzed": len(repos),
        "languages": _normalize_languages(languages_per_repo),
        "skill_signals": _extract_skill_signals(all_files, all_readmes),
        "commit_consistency_score": _commit_consistency(list(commits_per_repo.values())),
        "architecture_signals": _extract_architecture_signals(all_files),
    }