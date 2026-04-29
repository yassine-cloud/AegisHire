from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .fetcher import fetch_repos, fetch_languages, fetch_readme, fetch_file_tree, fetch_commits
from .analyser import analyse
from .neo4j_writer import write_skill_graph


router = APIRouter(prefix="/analyze", tags=["github"])


class GitHubAnalysisRequest(BaseModel):
    github_username: str


@router.post("/github")
async def analyze_github(body: GitHubAnalysisRequest):
    username = body.github_username.strip()

    try:
        repos = await fetch_repos(username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e), headers={"Retry-After": "60"})

    if not repos:
        raise HTTPException(status_code=422, detail="INSUFFICIENT_DATA")

    languages_per_repo = {}
    file_trees = {}
    readmes = {}
    commits_per_repo = {}

    import asyncio

    tasks = [
        asyncio.gather(
            fetch_languages(username, repo["name"]),
            fetch_file_tree(username, repo["name"]),
            fetch_readme(username, repo["name"]),
            fetch_commits(username, repo["name"]),
        )
        for repo in repos
    ]

    results = await asyncio.gather(*tasks)

    for repo, (langs, tree, readme, commits) in zip(repos, results):
        name = repo["name"]
        languages_per_repo[name] = langs
        file_trees[name] = tree
        readmes[name] = readme
        commits_per_repo[name] = commits

    result = analyse(repos, languages_per_repo, file_trees, readmes, commits_per_repo)
    await write_skill_graph(username, result)
    return result