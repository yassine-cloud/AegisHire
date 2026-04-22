# Graph Skill API

This app exposes endpoints to build and retrieve a candidate's skill graph stored in Neo4j.

Requirements
- Python 3.11+
- A Neo4j Aura instance (set `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` in your environment or .env)

Install (editable):
```bash
# from repo root
# from repo root
python -m pip install -e apps/worker/graph_skill
# or from the app directory
cd apps/worker/graph_skill
python -m pip install -e .
```

Run (development):
```bash
# from repo root
# from repo root
uvicorn apps.worker.graph_skill.main:app --host 0.0.0.0 --port 8000 --reload
```

Endpoints
- `POST /rebuild` — body: `{ "candidate_id": "id", "candidate_name": "name", "cv_data": {...}, "github_data": {...} }`
  - Triggers rebuild of candidate's Skill graph in Neo4j.
- `GET /graph/{candidate_id}` — returns adjacency list JSON (`nodes`, `edges`).
- `GET /health` — basic Neo4j connectivity check.

Notes
- The service lazily imports the `SkillGraphBuilder` to avoid import-time failures if optional deps are missing.
- If you run with a different working directory, ensure Python can import the `graph_skill` package (install with `-e` or adjust `PYTHONPATH`).
