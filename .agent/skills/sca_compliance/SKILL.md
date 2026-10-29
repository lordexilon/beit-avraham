---
name: sca-compliance
description: Standard Protocol for maintaining Smart Context Architecture (SCA) compliance. Updated for v2.0 Performance & Metrics.
version: 2.0.0
---

# SCA Compliance Protocol v2.0

This skill ensures the AI Agent strictly adheres to the **SCA (Smart Context Architecture)** to maximize development efficiency and minimize errors.

## 🧠 Core Philosophy
You are an **SCA-Compliant Agent**. You do not guess; you **Verify**.
You achieve contextual clarity through the **Context Bridge** and maintain the project's long-term memory.

## 📜 The 3 Laws of SCA
1. **READ FIRST**: Before any technical intervention, you MUST check `AI_CONTEXT/active_context.md` and `codebase_map.md`.
2. **UPDATE MEMORY**: Upon task completion, you MUST update `active_context.md` and log performance in `metricas_sca.md`.
3. **RESPECT BOUNDARIES**: You MUST NOT modify critical structures (documented in the map) without explicit validation.

## 🛠️ Usage Instructions

### When starting a task:
1. Examine the `AI_CONTEXT` directory.
2. Read `active_context.md` (Current state, WIP, Technical Debt).
3. Read `codebase_map.md` (Location of keys/RPCs/Components).
4. **Issue a Context Bridge**: Write a summary of what you understood before writing code.

### When finishing a task:
1. **Update Active Context**: Document changes, decisions, and new technical debt.
2. **Log Metrics**: Update `metricas_sca.md` with session data. 
   - **MUST** self-report your real LLM model identity in `LLM Model Used` (e.g. "Gemini 1.5 Pro", "Claude Sonnet 4.6"). Do NOT hardcode a generic value.
   - **MUST** explicitly state Token usage: `Tokens (Without SCA)` (estimated if you read entire codebase), `Tokens (With SCA)` (actual tokens used), and `Tokens Saved`.
   - **MUST** estimate ROI: `Estimated Time Saved` (vs manual coding), `Estimated API Cost`, `Lines of Code (LoC)`, and `Execution Loops`.
   - **MUST** append a new row to the `## 📊 Weekly History` table at the bottom of `metricas_sca.md`. Do NOT overwrite existing rows. Use this format:
     ```
     | W{week}-{year} | {sessions} | {cb_coverage}% | {success_rate}% | {tokens_saved} | {hit_density} | {LLM Model} |
     ```
     Where `week` is the ISO week number and `year` is the current year.
3. **Sync Map**: If new critical files were created, add them to `codebase_map.md`.

## 🚨 Error Handling & Audit
- **Inconsistency**: If you find a "blind spot" in the documentation, add it to the `## Technical Debt` section of `active_context.md`.
- **Health Check**: Use the `project_health_check` skill if you feel the context directory is disorganized.

## 📦 Compatibility
Supports multi-language workflows (`smart_context_es`, `smart_context_en`).
