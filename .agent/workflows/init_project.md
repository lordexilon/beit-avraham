---
description: Evaluates the project and bootstraps AI_CONTEXT (Context Bootstrapping)
---

# Workflow: Initialize Project Brain 🧠

> **Purpose:** Evaluate the project explicitly and auto-configure the "brain" based on detected stack, architecture, and patterns.

---

## Phase 1: 🔍 Tech Stack Scan

### 1.1 Identify Language & Framework
```text
// turbo
1. List root config files:
   - package.json (Node/JS/TS)
   - requirements.txt / pyproject.toml (Python)
   - go.mod (Go)
   - Cargo.toml (Rust)
   - pom.xml (Java)
```

### 1.2 Identify Database
```text
Search for:
- supabase/
- prisma/schema.prisma
- docker-compose.yml (db services)
- .env (connection strings)
```

## Phase 2: 🏗️ Architecture Mapping

### 2.1 Detect Project Type
```text
Evaluate directory structure:
- Monolith (src/components + src/api)
- Monorepo (packages/)
- Microservices (Multiple Dockerfiles)
- Backend/Frontend Only
```

## Phase 3: 📝 Generate AI_CONTEXT

### 3.1 Create/Update `project_profile.md`
Generate a file with:
- Detected Stack
- Architecture Type
- Recommended Search Strategy

### 3.2 Update `codebase_map.md`
Populate with entry points and critical config files.

### 3.3 Initialize `active_context.md`
Create with initial state "Ready for tasking".

### 3.4 Ingest to Codebase Memory (MCP)
If the `codebase-memory` MCP server is enabled, the agent must execute the `index_repository` tool (or similar) to index the project structure and populate the semantic memory/codebase graph.

## Phase 4: ✅ Validation and Report

### 4.1 Emit Bootstrap Report
```markdown
📝 PROJECT BOOTSTRAP COMPLETE
──────────────────────────────────────
🏷️ Project: [name]
🔧 Stack: [detected stack]
🏗️ Architecture: [type]
📂 Critical Files Mapped: [count]
🛡️ Protocol: v2.6 (Gatekeeper Edition) Active
──────────────────────────────────────
Status: ✅ Ready. REMEMBER: Use /sca_dev_flow for code changes.
```
