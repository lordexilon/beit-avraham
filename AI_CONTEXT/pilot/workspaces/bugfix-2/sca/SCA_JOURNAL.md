# SCA journal

Scope: N12 authorized local fixture bugfix. Correct activeAt interval lookup; preserve caller data.

Plan (all Pending):
1. Recover relevant implementation and acceptance context.
2. Implement inclusive starts, exclusive ends, null for gaps and negative times without caller mutation.
3. Run required acceptance suite and review changes.

Context: TASK.md defines behavior and verification; SCA_PROTOCOL.md selects local workflow-only-v1 journal, with no remote Matrix, retrieval or swarm.

Transitions:
- Step 1: Pending -> In progress.
- Step 1: In progress -> Done. study.cjs currently includes interval ends; acceptance.cjs checks adjacent boundaries, empty arrays, gaps and frozen inputs.
- Step 2: Pending -> In progress. Keep caller order and use non-mutating find; explicitly reject negative times.
- Step 2: In progress -> Done. Changed end comparison to exclusive and added negative-time guard. No sorting or mutation.
- Step 3: Pending -> In progress.
- Step 3: In progress -> Done. Required command `node --test acceptance.cjs` invoked once: exit 0, 1 test passed, 0 failed. Reviewed final study.cjs: lookup uses find, inclusive start and exclusive end, negative guard, and null fallback.

Changed files: study.cjs; SCA_JOURNAL.md (new). acceptance.cjs and package.json unchanged.
Limitations: Only local supplied acceptance suite executed. No human review, external integrations, deployment or cost/savings claims. Overlapping intervals preserve the existing first-match caller-order behavior; task does not specify another overlap policy.

N12 local fixture complete after verification.
