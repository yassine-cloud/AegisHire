import os
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "password1234")


async def write_skill_graph(github_username: str, analysis: dict) -> None:
    async with AsyncGraphDatabase.driver(URI, auth=(USER, PASSWORD)) as driver:
        async with driver.session() as session:
            await session.execute_write(_write, github_username, analysis)


async def _write(tx, github_username: str, analysis: dict) -> None:
    # create or merge candidate node
    await tx.run(
        "MERGE (c:Candidate {github_username: $username})",
        username=github_username,
    )

    # create skill nodes and relationships
    for signal in analysis["skill_signals"]:
        await tx.run(
            """
            MERGE (s:Skill {name: $skill})
            WITH s
            MATCH (c:Candidate {github_username: $username})
            MERGE (c)-[r:HAS_SKILL]->(s)
            SET r.confidence = $confidence, r.evidence = $evidence
            """,
            skill=signal["skill"],
            username=github_username,
            confidence=signal["confidence"],
            evidence=signal["evidence"],
        )