# N12 local journal
Scope: activeAt repair only. acceptance.cjs and package.json were not edited.
Plan and transitions:
- Inspect context: Pending -> In progress -> Done.
- Implement interval lookup: Pending -> In progress -> Done.
- Verify acceptance and inspect final implementation: Pending -> In progress -> Done.
References: TASK.md, SCA_PROTOCOL.md, study.cjs, acceptance.cjs.
Finding: original predicate included interval ends. Repair uses inclusive start and exclusive end with explicit negative-time rejection. find preserves caller array order and does not mutate input.
Verification: node --test acceptance.cjs invoked once; exit 0; 1 test passed, 0 failed. Final implementation inspected. Frozen-array acceptance checks passed.
Journal persistence: an intermediate overwrite hit a transient file lock; retried final journal write.
Limitations: isolated fixture; acceptance covers the listed boundary cases only. No external integration, Matrix writes, human review, costs or savings measured.
