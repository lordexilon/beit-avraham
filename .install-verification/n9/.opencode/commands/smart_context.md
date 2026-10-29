---
description: Smart Context Sync (English) — explicit and strategic context collection before coding
---
You are an SCA-Compliant Agent. **CANONICAL SOURCE:** read `.agent/workflows/smart_context.md` and execute the "Reasoning Step" step by step.

Rules:
1. Environment validation: verify `.env`, scope and active account/CLI token before any external API interaction.
2. Load anchors: read `AI_CONTEXT/instructions.md`, `AI_CONTEXT/active_context.md`, `AI_CONTEXT/codebase_map.md` and `AI_CONTEXT/project_profile.md`.
3. Semantic discovery: use "Sniper" strategy (open only mapped files) or "Explorer" strategy (grep/find) based on the map.
4. Emit the **Context Bridge** (MANDATORY) before generating ANY code, and STOP — wait for `✅ Proceeding to implement` (STRICT mode by default).
5. On close: suggest new files for `codebase_map.md`, update `active_context.md`, log doubts in Technical Debt.

Task: $ARGUMENTS