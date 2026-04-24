# Gap Report Architecture Decision

## Decision: Use PostgreSQL (JSONB) for Skills Storage

We store user skills directly in the `Profile.skills` field using PostgreSQL `JSONB`.

### Why PostgreSQL?

* **Simplicity**: Current requirements only involve comparing user skills with role requirements.
* **Performance**: JSONB handles flexible structured data efficiently.
* **Maintainability**: Avoids unnecessary complexity from introducing additional systems (e.g., Neo4j).
* **Scalability**: Supports indexing and querying without overengineering.

### Why Not Neo4j?

* Current use case does **not require graph traversal** or multi-hop relationships.
* Existing “confidence lookup” does not leverage true graph capabilities.
* Adds operational and cognitive overhead without meaningful benefit.

---

## Current Gap Logic

* Compute missing skills via simple set difference:

  * `missing = roleSkills - userSkills`
* Assign basic levels:

  * Present → `"has"`
  * Missing → `"none"`

---

## Future Enhancements

### 1. Skill Similarity via Embeddings

* Use vector embeddings (e.g., pgvector)
* Enable fuzzy matching:

  * `"NestJS"` ≈ `"Node.js"`
* Compute similarity using cosine distance

### 2. LLM-Based Reasoning

* Use LLMs to:

  * Infer transferable skills
  * Generate richer gap explanations

### 3. Optional Graph Layer (Only If Needed)

Introduce a graph database *only if*:

* Building a full skill ontology
* Modeling career paths or dependencies
* Running complex relationship queries

---

## Guiding Principle

> Build for current needs. Keep extension points clean. Avoid premature complexity.
