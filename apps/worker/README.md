# Worker Service

The worker is a single FastAPI app running from `apps/worker/main.py`.

## What Changed

- The project previously had a second FastAPI app in `graph_skill/main.py`.
- Graph skill endpoints are now exposed through the root worker app as an included router.
- You only need one worker process.

## Run (uv)

From `apps/worker`:

```bash
uv sync
uv run fastapi dev
```

Server URL: `http://localhost:8000`

## Endpoints

Core worker endpoints:

- `GET /`
- `GET /health`
- `POST /parse-cv`

GitHub analysis endpoints are mounted from `github/router.py`.

Graph skill endpoints are mounted under `/graph-skill`:

- `POST /graph-skill/rebuild`
- `GET /graph-skill/graph/{candidate_id}`
- `GET /graph-skill/health`

## Project Structure

- `main.py`: Root FastAPI app and worker entrypoint
- `github/`: GitHub analysis logic and routes
- `graph_skill/`: Skill graph builder and router
- `parsers/`: CV parsing code
- `pyproject.toml`: Python dependencies

## Notes

- Prefer running from the root worker app (`main.py`) for local dev and team usage.
- `graph_skill/main.py` now provides a router and can still run standalone for debugging if needed.
