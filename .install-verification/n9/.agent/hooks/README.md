# Lifecycle Hooks

Hooks allow you to enforce strict compliance protocols automatically during the agent's lifecycle.

## Recommended Hooks

### Pre-Tool Use (Safety & Compliance)
Execute `/smart_context` automatically before the agent uses tools that modify the filesystem.
- **Trigger**: `PreToolExecution`
- **Action**: Read `AI_CONTEXT/active_context.md`
- **Goal**: Prevent "Hallucinated Context" by ensuring the agent has the latest state before acting.

### Post-Task (Cleanup)
Execute a context cleanup after a major workflow.
- **Trigger**: `PostWorkflow`
- **Action**: Update `AI_CONTEXT/active_context.md` with new findings.

## Implementation
Currently, these hooks rely on the Agent's "System Prompt" or "Operating Mode".
In environments that support `lifecycle_hooks.yaml` or similar, configure them there.

**For Antigravity:**
The agent implicitly treats `/smart_context` as a PreReq for complex tasks.
