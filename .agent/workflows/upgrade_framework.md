---
description: Migrates an existing SCA project to version 3.0 (Swarm Edition)
---

# Workflow: SCA Framework Upgrade (v3.0) 🚀

> **Purpose:** Update the cognitive infrastructure to v3.0, enforcing the Swarm Router Protocol and advanced telemetry.

---

## Phase 1: 🛡️ Preparation and Backup

### 1.1 Run Migration Script
```text
// turbo
Run the upgrade script from the root:
python upgrade.py
```

## Phase 2: 🔍 Structure Verification

### 2.1 Validate New Metric Fields
Check that `AI_CONTEXT/metricas_sca.md` now includes:
- **Development Latency** table.
- **Token Delta** and **Hit Density** fields.

### 2.2 Validate Master Instructions
Review that `AI_CONTEXT/instructions.md` includes the **System Audit Log** rule.

## Phase 3: 🛠️ Telemetry Initialization

### 3.1 Activate Extraction Skill
```text
// turbo
Test the new telemetry skill:
python .agent/skills/metric_extractor/scripts/extractor.py
```

### 3.2 Initial Synchronization
Update `active_context.md` with the status "Migrated to v3.0 - Swarm Edition".

## Phase 4: ✅ Upgrade Report

### 4.1 Issue Migration Context Bridge
```markdown
📝 SCA FRAMEWORK UPGRADE COMPLETE
──────────────────────────────────────
📦 Previous Version: v2.0
🚀 New Version: v3.0 (Swarm Edition)
📁 Backup Created: [Backup path]
🛡️ Protocol: Swarm Router Enforced (/swarm_router)
──────────────────────────────────────
Status: ✅ v3.0 Active
```
