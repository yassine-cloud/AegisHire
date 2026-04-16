from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
import traceback
import os

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Graph Skill API", version="0.1.0")


class RebuildRequest(BaseModel):
    candidate_id: str
    candidate_name: str
    cv_data: Optional[Dict[str, Any]] = {
 
}
    github_data: Optional[Dict[str, Any]] = {
     
    }


_builder = None


def get_builder():
    """Lazily import and instantiate the SkillGraphBuilder.

    Tries a relative import first (package use), then an absolute import as fallback.
    """
    global _builder
    if _builder is None:
        try:
            from .graph_skill_db.builder import SkillGraphBuilder
        except Exception:
            try:
                from graph_skill.graph_skill_db.builder import SkillGraphBuilder
            except Exception as e:
                raise RuntimeError(f"Failed to import SkillGraphBuilder: {e}")

        _builder = SkillGraphBuilder()
    return _builder


@app.post("/rebuild")
async def rebuild(req: RebuildRequest):
    try:
        builder = get_builder()
        builder.rebuild_graph(req.candidate_id, req.candidate_name, req.cv_data or {}, req.github_data or {})
        return {"status": "ok", "candidate_id": req.candidate_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/graph/{candidate_id}")
async def get_graph(candidate_id: str):
    try:
        builder = get_builder()
        graph = builder.get_candidate_skill_graph(candidate_id)
        return graph
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    try:
        builder = get_builder()
        # simple connectivity check
        with builder.driver.session() as session:
            _ = session.run("RETURN 1").single()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.graph_skill.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=False)
