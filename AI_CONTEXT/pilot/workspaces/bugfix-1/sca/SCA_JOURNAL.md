# SCA journal

Scope: N12, local bugfix fixture only. Fix activeAt with inclusive start, exclusive end, null for gaps and negative time, and no caller mutation or sorting.

Plan and transitions:
- N12.1 Inspect relevant context: Pending -> In progress -> Done. Read TASK.md, SCA_PROTOCOL.md, study.cjs, acceptance.cjs, package.json. No additional context is present in this fixture.
- N12.2 Implement boundary fix: Pending -> In progress. Preserve Array.find order and add explicit negative-time guard.
- N12.3 Verify acceptance and review: Pending. Run node --test acceptance.cjs and inspect final implementation.

Limitations: Local workflow-only profile; no remote Matrix, external context, dependencies, network, or human-review claim. No comparative cost or savings measurement.

Implementation: N12.2 In progress -> Done. The end comparison is now strict; negative times return before searching. Array.find reads the original array without sorting or writing.
Verification: N12.3 Pending -> In progress.

Verification: N12.3 In progress -> Done. One invocation of node --test acceptance.cjs; exit 0, 1 test passed, 0 failed. Acceptance covers shared boundary, terminal end, negative time, gap, empty input, inclusive start, and frozen caller data. Final source review confirms no sorting or mutation and an explicit guard even for intervals with negative starts.

N12 complete after validation. Changed files: study.cjs and SCA_JOURNAL.md. acceptance.cjs and package.json were not edited. Limitations remain as recorded above; no deployment or Matrix writes.
