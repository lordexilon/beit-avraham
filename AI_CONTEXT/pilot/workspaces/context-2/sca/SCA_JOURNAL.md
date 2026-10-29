# SCA journal — N12
Scope: implement visibleSources(catalog, courseId) inside this fixture; preserve paid-course and source authorization policy. No remote persistence or dependencies.

Plan:
- N12.1 Pending: recover policy, catalog shape and existing module responsibilities.
- N12.2 Pending: implement visibleSources using relevant context.
- N12.3 Pending: run acceptance and inspect final changes.

N12.1 In progress: inspect docs/policy.md, catalog.cjs, study.cjs and acceptance.cjs.

N12.1 Done: docs/policy.md requires matching courseId, owned === true or permission === 'licensed', and original order. catalog.cjs supplies flat source objects; study.cjs is the public function module. acceptance.cjs verifies visible IDs, missing course, and catalog length.
N12.2 In progress: implement a non-mutating filter in study.cjs.
N12.2 Done: filter preserves source identity, input order and catalog contents; public/free sources alone remain excluded.
N12.3 In progress: run the mandated acceptance command and inspect resulting files.
N12.3 Done: node --test acceptance.cjs invoked once; exit 0, 1 test passed, 0 failed. Inspected final implementation and journal. acceptance.cjs, package.json, catalog.cjs and policy remain unchanged.

Limitations: acceptance contains one automated case; no manual or human review performed. No baseline, savings, cost, external integration or deployment claim. All reads and writes stayed inside this fixture.
