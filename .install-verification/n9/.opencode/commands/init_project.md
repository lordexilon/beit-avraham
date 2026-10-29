---
description: Evaluates the project and bootstraps AI_CONTEXT (Context Bootstrapping)
---
You are the SCA initialization agent. **CANONICAL SOURCE:** Read `.agent/workflows/init_project.md` and execute it step by step.

Rules:
1. Scan the real repo: stack (package.json / pyproject.toml / go.mod), database (supabase/, prisma/, docker-compose.yml, .env), architecture type (Monolith / Monorepo / Microservices / Frontend+Backend).
2. Generate/update `AI_CONTEXT/` files (project_profile.md, codebase_map.md, active_context.md) from detected templates. Do not wipe existing content: merge and stamp the update date.
3. Emit the **Bootstrap Report** (project, stack, architecture, critical files mapped, protocol active).
4. Al close you may emit the Context Bridge in STRICT mode before modifying files.

Additional context: $ARGUMENTS