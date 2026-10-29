---
description: Standard Development Workflow (Gatekeeper Protocol) for v2.6
---

# Workflow: SCA Development Flow (Gatekeeper Protocol) 🛡️

> **Objective:** Ensure all code modifications follow the SCA v2.6 standards, maintaining high traceability and context integrity.

## Phase 1: ⚓ Context Loading & Bridge
1. **Sync Context**: Invoke `smart_context` to load all relevant anchors.
2. **Issue Context Bridge**: Before writing any code, emit the bridge:
   ```markdown
   📝 CONTEXT BRIDGE
   ──────────────────────────────────────
   🎯 Objective: [What are we doing?]
   📂 Files: [What will be modified?]
   ⚠️ Risks: [Potential side effects]
   💰 Token Budget: [Estimated usage]
   🧪 Verification: [How to test]
   ──────────────────────────────────────
   ```
3. **Wait for Approval**: Proceed only after explicit user approval or if the task is clearly defined and low-risk.

## Phase 2: 🛠️ Implementation
1. **Iterative Development**: Apply changes using `replace_file_content` or `multi_replace_file_content`.
2. **Follow Rules**: Adhere strictly to `AI_CONTEXT/instructions.md`.
3. **Internal Testing**: Run relevant scripts or commands to verify changes.

## Phase 3: 📊 Closing & Metrics
1. **Extract Telemetry**: Run the `metric_extractor` skill to sync Git history with audit logs.
2. **Update Context**: Reflect progress in `AI_CONTEXT/active_context.md`.
3. **Update Metrics**: Log session stats in `AI_CONTEXT/metricas_sca.md`.
4. **Final Report**:
   ```markdown
   ✅ TASK COMPLETE
   ──────────────────────────────────────
   📂 Modified: [File list]
   📈 Hit Density: [Calculated %]
   💰 Tokens Saved: [Estimated delta]
   ──────────────────────────────────────
   ```
