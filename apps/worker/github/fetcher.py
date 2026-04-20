import httpx
import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API = "https://api.github.com"

BASE_HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


async def fetch_repos(username: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/users/{username}/repos",
            headers=BASE_HEADERS,
            params={"sort": "pushed", "per_page": 30, "type": "owner"},
        )
        if r.status_code == 404:
            raise ValueError(f"GitHub user '{username}' not found")
        if r.status_code == 403:
            raise ConnectionError("GitHub API rate limit exceeded")
        r.raise_for_status()
        repos = r.json()
        owned = [repo for repo in repos if not repo["fork"]]
        sorted_repos = sorted(owned, key=lambda x: (x["stargazers_count"], x["pushed_at"]), reverse=True)
        return sorted_repos[:10]


async def fetch_languages(username: str, repo_name: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{username}/{repo_name}/languages",
            headers=BASE_HEADERS,
        )
        return r.json() if r.status_code == 200 else {}


async def fetch_readme(username: str, repo_name: str) -> str:
    raw_headers = {**BASE_HEADERS, "Accept": "application/vnd.github.raw+json"}
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{username}/{repo_name}/readme",
            headers=raw_headers,
        )
        return r.text[:3000] if r.status_code == 200 else ""


async def fetch_file_tree(username: str, repo_name: str) -> list[str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{username}/{repo_name}/git/trees/HEAD",
            headers=BASE_HEADERS,
            params={"recursive": "1"},
        )
        if r.status_code != 200:
            return []
        return [item["path"] for item in r.json().get("tree", []) if item["type"] == "blob"]


async def fetch_commits(username: str, repo_name: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{username}/{repo_name}/commits",
            headers=BASE_HEADERS,
            params={"per_page": 30, "author": username},
        )
        return r.json() if r.status_code == 200 else []