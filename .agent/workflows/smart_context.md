# Workflow: Smart Context Sync (English)

This workflow implements the "Reasoning Step" to overcome traditional automatic search, forcing an explicit and strategic context collection before coding.

## 0. 🧪 Environment Validation (MANDATORY)
1. **Verify Project**: Before any interaction with external APIs, read the `.env` file or environment configurations.
2. **Ensure Correct Scope**: Confirm that project IDs and URLs correspond to the current project and not others.
3. **Account Validation**: Verify that the active token or account in CLI tools matches the current project environment.

## 1. ⚓ Loading Anchors (The "Brain")
1. **Master Instructions**: Read `AI_CONTEXT/instructions.md` to align decisions with business rules.
2. **Active Context**: Read `AI_CONTEXT/active_context.md` to understand the current task's progress (includes Technical Debt).
3. **Treasure Map**: Read `AI_CONTEXT/codebase_map.md` to locate key definitions without searching blindly.
4. **Project Profile**: Read `AI_CONTEXT/project_profile.md` to adapt the search methodology to the specific stack.

## 2. 🔍 Semantic Discovery (The Search)
Based on the User Request, the agent must execute:

- **"Sniper" Strategy (If Map exists)**:
  - Search `codebase_map.md` for the mentioned functionality.
  - Open ONLY the files indicated in the map for that feature.

- **"Explorer" Strategy (If new)**:
  - Execute `grep_search` with technical keywords.
  - Execute `find_by_name` to locate files related by name.

## 3. 🌉 Context Bridge (MANDATORY)
> **Golden Rule:** Before generating ANY code, the agent MUST issue a brief structured summary of what it understood.

**Context Bridge Format:**
```
📍 CONTEXT BRIDGE - [Task Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Understood Objective: [1-2 lines summary]
📂 Relevant Files: [List of identified files]
⚠️ Detected Constraints: [Applicable rules from instructions.md]
🔗 Dependencies: [Related RPC functions or components]
❓ Technical Debt Doubts: [If there are any inconsistencies]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Proceeding to implement / ❌ Need clarification
```

**Benefit:** This ensures the agent not only read the files but UNDERSTOOD them in relation to the current task.

## 4. 🧠 Synthesis and Update
1. **Update Map**: If important new files are discovered, suggest adding them to `codebase_map.md`.
2. **Update Active Context**: If information changes the task's direction, edit `AI_CONTEXT/active_context.md`.
3. **Log Doubts**: If inconsistencies or blind spots are found, they MUST be added to the `## Technical Debt / Pending Questions` section of `active_context.md`.
4. **STOP**: Do not write code until the relevant context is loaded into conversation memory (via `view_file`) AND the Context Bridge has been issued.
