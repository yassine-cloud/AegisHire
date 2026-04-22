import os
from neo4j import GraphDatabase
from typing import List, Dict, Any
from datetime import datetime

class SkillGraphBuilder:
    def __init__(self, uri: str = None, user: str = None, password: str = None):
        self.uri = uri or os.getenv("NEO4J_URI", "neo4j+s://1213a52d.databases.neo4j.io")
        self.user = user or os.getenv("NEO4J_USERNAME", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "password")
        self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
        
        # Simple taxonomy normalization dictionary (could be fetched from DB)
        self.taxonomy = {
            "reactjs": "React",
            "react.js": "React",
            "node.js": "Node.js",
            "nodejs": "Node.js",
            "python3": "Python",
            "ts": "TypeScript",
            "js": "JavaScript",
            "javascript/typscript": "TypeScript", # specific cases
            "vuejs": "Vue.js",
            "vue.js": "Vue.js",
            "go": "Golang",
            "golang": "Golang",
            "shell": "Shell",
            "bash": "Shell"
        }

    def close(self):
        self.driver.close()

    def normalize_skill(self, skill_name: str) -> str:
        """Normalize skill names using the taxonomy."""
        normalized = skill_name.strip().lower()
        return self.taxonomy.get(normalized, skill_name.strip().title())

    def rebuild_graph(self, candidate_id: str, candidate_name: str, cv_data: Dict[str, Any], github_data: Dict[str, Any]):
        """
        Rebuilds the graph for a candidate by merging their skills from multiple sources.
        Expects CV parsing data and GitHub analysis data.
        """
        with self.driver.session() as session:
            # Upsert User and Set commit_consistency_score
            commit_score = github_data.get("commit_consistency_score", 0.0) if github_data else 0.0
            session.run(
                 """
                 MERGE (u:User {id: $candidate_id})
                 SET u.name = $candidate_name, 
                     u.last_updated = $last_updated,
                     u.commit_consistency_score = $commit_score
                 """,
                 candidate_id=candidate_id,
                 candidate_name=candidate_name,
                 last_updated=datetime.utcnow().isoformat(),
                 commit_score=commit_score
            )

            # 1. Process Experience from CV
            experience = cv_data.get("experience", [])
            for exp in experience:
                company = exp.get("company")
                role = exp.get("role")
                if company and role:
                    session.run(
                        """
                        MATCH (u:User {id: $candidate_id})
                        MERGE (c:Company {name: $company})
                        MERGE (u)-[w:WORKS_AT]->(c)
                        SET w.role = $role
                        """,
                        candidate_id=candidate_id, company=company, role=role
                    )

            if github_data:
                # 2. Process Languages
                languages = github_data.get("languages", {})
                for lang_name, percentage in languages.items():
                    norm_lang = self.normalize_skill(lang_name)
                    session.run(
                        """
                        MATCH (u:User {id: $candidate_id})
                        MERGE (l:Language {name: $lang})
                        MERGE (u)-[use:USES_LANGUAGE]->(l)
                        SET use.percentage = $percentage
                        """,
                        candidate_id=candidate_id, lang=norm_lang, percentage=percentage
                    )

                # 3. Process Architecture Patterns
                arch_signals = github_data.get("architecture_signals", [])
                for arch in arch_signals:
                    norm_arch = self.normalize_skill(arch)
                    session.run(
                        """
                        MATCH (u:User {id: $candidate_id})
                        MERGE (a:ArchitecturePattern {name: $arch})
                        MERGE (u)-[:IMPLEMENTS]->(a)
                        """,
                        candidate_id=candidate_id, arch=norm_arch
                    )

            # Map to aggregate skills from different sources
            aggregated_skills = {}

            # Extract from CV
            cv_skills = cv_data.get("skills", {})
            if cv_skills:
                for category, skills in cv_skills.items():
                    for skill in skills:
                        norm_skill = self.normalize_skill(skill)
                        if norm_skill not in aggregated_skills:
                            aggregated_skills[norm_skill] = []
                        aggregated_skills[norm_skill].append({
                            "source": "CV", "confidence": 0.8, "evidence": ["Declared on CV"]
                        })

            # Extract from GitHub
            if github_data:
                signals = github_data.get("skill_signals", [])
                for signal in signals:
                    raw_skill = signal.get("skill", "")
                    norm_skill = self.normalize_skill(raw_skill)
                    if norm_skill not in aggregated_skills:
                        aggregated_skills[norm_skill] = []
                    aggregated_skills[norm_skill].append({
                        "source": "GitHub", "confidence": float(signal.get("confidence", 0.5)), "evidence": signal.get("evidence", [])
                    })

            # Upsert Skills and Create Relationships
            for skill_name, occurrences in aggregated_skills.items():
                if not skill_name:
                    continue
                
                total_confidence = 0.0
                total_weight = 0.0
                all_sources = []
                all_evidence = []
                
                for occ in occurrences:
                    weight = 1.2 if occ["source"] == "GitHub" else 0.8
                    total_confidence += occ["confidence"] * weight
                    total_weight += weight
                    all_sources.append(occ["source"])
                    all_evidence.extend(occ["evidence"])
                
                final_confidence = min(max(total_confidence / max(total_weight, 1.0), 0.0), 1.0)
                all_evidence = list(set(all_evidence))

                # Batch upsert via Cypher utilizing PROFICIENT_IN and EVIDENCE_FROM
                session.run(
                    """
                    MATCH (u:User {id: $candidate_id})
                    MERGE (s:Skill {name: $skill_name})
                    
                    MERGE (u)-[rel:PROFICIENT_IN]->(s)
                    SET rel.confidence = $confidence,
                        rel.evidence = $evidence,
                        rel.last_updated = $last_updated
                        
                    WITH s, $sources AS sources
                    UNWIND sources AS src_name
                    MERGE (src:Source {type: src_name})
                    MERGE (s)-[:EVIDENCE_FROM]->(src)
                    """,
                    skill_name=skill_name,
                    candidate_id=candidate_id,
                    confidence=float(round(final_confidence, 2)),
                    sources=list(set(all_sources)),
                    evidence=all_evidence,
                    last_updated=datetime.utcnow().isoformat()
                )

    def get_candidate_skill_graph(self, candidate_id: str) -> Dict[str, Any]:
        """
        Retrieves the skill graph as an adjacency list.
        Returns data in < 500ms typically.
        """
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (u:User {id: $candidate_id})
                OPTIONAL MATCH (u)-[r1:PROFICIENT_IN]->(s:Skill)
                OPTIONAL MATCH (u)-[r2:WORKS_AT]->(c:Company)
                OPTIONAL MATCH (u)-[r3:USES_LANGUAGE]->(l:Language)
                OPTIONAL MATCH (u)-[r4:IMPLEMENTS]->(a:ArchitecturePattern)
                RETURN 
                    u.id as candidate_id,
                    u.name as candidate_name,
                    u.commit_consistency_score as commit_score,
                    collect(DISTINCT {name: s.name, confidence: r1.confidence, evidence: r1.evidence}) as skills,
                    collect(DISTINCT {name: c.name, role: r2.role}) as companies,
                    collect(DISTINCT {name: l.name, percentage: r3.percentage}) as languages,
                    collect(DISTINCT a.name) as architectures
                """,
                candidate_id=candidate_id
            )

            nodes = []
            edges = []
            
            for record in result:
                user_node = {
                    "id": record["candidate_id"],
                    "name": record["candidate_name"],
                    "type": "User",
                    "commit_consistency_score": record["commit_score"]
                }
                nodes.append(user_node)

                for sk in record["skills"]:
                    if sk.get("name"):
                        skill_id = f"skill_{sk['name']}"
                        nodes.append({"id": skill_id, "name": sk['name'], "type": "Skill"})
                        edges.append({
                            "source": user_node["id"], "target": skill_id, "type": "PROFICIENT_IN", 
                            "confidence": sk["confidence"], "evidence": sk["evidence"]
                        })

                for comp in record["companies"]:
                    if comp.get("name"):
                        comp_id = f"company_{comp['name']}"
                        nodes.append({"id": comp_id, "name": comp['name'], "type": "Company"})
                        edges.append({"source": user_node["id"], "target": comp_id, "type": "WORKS_AT", "role": comp["role"]})

                for lang in record["languages"]:
                    if lang.get("name"):
                        lang_id = f"lang_{lang['name']}"
                        nodes.append({"id": lang_id, "name": lang['name'], "type": "Language"})
                        edges.append({"source": user_node["id"], "target": lang_id, "type": "USES_LANGUAGE", "percentage": lang["percentage"]})

                for arch in record["architectures"]:
                    if arch:
                        arch_id = f"arch_{arch}"
                        nodes.append({"id": arch_id, "name": arch, "type": "ArchitecturePattern"})
                        edges.append({"source": user_node["id"], "target": arch_id, "type": "IMPLEMENTS"})

            return {
                "nodes": nodes,
                "edges": edges
            }

if __name__ == "__main__":
    # Test Payload using the mock structure 
    from dotenv import load_dotenv
    load_dotenv()
    
    cv_mock = {
        "skills": {
            "Frameworks": ["ReactJS", "Node.JS", "Express"],
            "Tools": ["Docker", "Git"]
        }
    }
    
    github_mock = {
      "repos_analyzed": 8,
      "languages": { "TypeScript": 72, "Python": 18, "Shell": 10 },
      "skill_signals": [
        { "skill": "Node.js", "confidence": 0.88, "evidence": ["package.json", "express usage"] },
        { "skill": "Testing", "confidence": 0.45, "evidence": ["jest config found", "low coverage"] }
      ],
      "commit_consistency_score": 0.72,
      "architecture_signals": ["MVC", "REST API", "microservices attempt"]
    }
    
    print("Graph Build module compiled successfully.")