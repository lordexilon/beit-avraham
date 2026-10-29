# SCA Journal

Scope: N12 fixture only. Add visibleSources(catalog, courseId) without changing paid-course/source authorization policy. TASK.md and SCA_PROTOCOL.md read. No Matrix, external context, dependency or network access.

Plan:
1. Recover policy and implementation context — Pending.
2. Implement policy-preserving source visibility — Pending (depends on 1).
3. Run acceptance and review result — Pending (depends on 2).

Transitions:
- 1: Pending -> In progress.

Context references: docs/policy.md defines owned=true OR permission=licensed, courseId scope, original order. study.cjs contains placeholder; catalog.cjs provides mixed sources. acceptance.cjs checks policy/scope and catalog length. package.json and acceptance.cjs remain intact.
- 1: In progress -> Done.
- 2: Pending -> In progress.
- 2: In progress -> Done. Implemented non-mutating filter with strict policy predicates.
- 3: Pending -> In progress.
Verification: node --test acceptance.cjs invoked once; exit 0, 1 test passed, 0 failed. Reviewed implementation: Array.filter preserves order, keeps original objects, does not mutate catalog, excludes public-only sources and other courses. No manual acceptance requested.
- 3: In progress -> Done.

Final: N12 complete after verification. Changed study.cjs and added this local journal only. Limitations: acceptance contains one fixture test; no human review, external integration, deployment, costs or savings measured.
