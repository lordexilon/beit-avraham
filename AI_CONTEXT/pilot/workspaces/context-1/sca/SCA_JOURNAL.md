# N12 local journal

Scope: implement `visibleSources(catalog, courseId)` within this fixture. Preserve the paid-course source policy, catalog order, and input catalog. No remote persistence or human review claimed.

Context: `TASK.md` defines acceptance; `SCA_PROTOCOL.md` authorizes local substeps; `docs/policy.md` permits only `owned=true` or `permission=licensed` for the requested course. `study.cjs` is the implementation stub; `catalog.cjs` supplies examples; `acceptance.cjs` verifies scope, policy, and unchanged catalog length.

Plan and transitions:
- Inspect policy and implementation: Pending -> In progress -> Done. Relevant context read.
- Implement strict ownership/licensing and course filtering: Pending -> In progress -> Done. Array filtering preserves source order without mutating the catalog.
- Run `node --test acceptance.cjs` and inspect final changes: Pending -> In progress -> Done. One invocation: exit 0, 1 test passed, 0 failed. Final source inspection confirmed strict course/permission comparisons; `acceptance.cjs` and `package.json` remain unchanged.

Limitations: fixture-only validation; no external services, deployment, telemetry, savings, costs, or human review.
