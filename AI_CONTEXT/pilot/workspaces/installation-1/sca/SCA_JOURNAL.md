# SCA local journal — N12

Scope: isolated bootstrap fixture; no real installer, Matrix, network, or deployment changes.
References: TASK.md, SCA_PROTOCOL.md, bootstrap.cjs, acceptance.cjs, package.json.

Plan (authorized substeps, sequential):
1. Inspect fixture and acceptance: Pending -> In progress -> Done.
2. Implement validated, secret-free bootstrap: Pending -> In progress -> Done.
3. Run acceptance and inspect result: Pending -> In progress -> Done.

Changes: validate nonblank project_name and UUID cycle_id; preflight nonempty scripts/migrations and destination; recursively copy required trees; skip common credential names/extensions; reject source symlinks; write AI_CONTEXT/project_binding.json. Added bootstrap.test.cjs. acceptance.cjs and package.json remain intact.

Verification (process TEMP/TMP set to local .test-temp):
- node --test acceptance.cjs: exit 0, 1 passed, 0 failed.
- node --test acceptance.cjs bootstrap.test.cjs: exit 0, 2 passed, 0 failed. Covers invalid binding, missing/empty trees without destination writes, preexisting empty destination, recursive copying, nested credentials omission, nonempty destination and destination inside source.
- Inspected implementation and passing test outputs before closing N12.

Limits: secrets exclusion is filename based, not content scanning. Unexpected I/O failures during copying can leave partial destination; missing pieces and invalid input fail before writes. This fixture cannot certify installation, capture, API/UI behavior, or human review; no savings/cost claims.
