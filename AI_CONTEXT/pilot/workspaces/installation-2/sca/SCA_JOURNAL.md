# SCA journal — N12

Scope: isolated bootstrap fixture; all substeps authorized. No Matrix, installer, network or deployment work.

Plan:
- Pending: inspect TASK.md, SCA_PROTOCOL.md, bootstrap.cjs and acceptance.cjs.
- Pending: validate inputs and copy mandatory runtime directories, excluding secrets.
- Pending: run acceptance and targeted failure checks; record limitations.

Context: TASK.md requires scripts, migrations, valid binding and empty destination. acceptance.cjs supplies capture.cjs, 001.sql and project_name/cycle_id; package.json declares node --test acceptance.cjs.

Transitions:
- Inspection: Pending -> In progress -> Done (files read).
- Implementation: Pending -> In progress.
- Verification: Pending.

- Implementation: In progress -> Done. bootstrap.cjs validates paths and binding, preflights nonempty mandatory directories, copies nested regular files, excludes common secret filenames, rejects symlinks and occupied destinations, and writes AI_CONTEXT/project_binding.json.
- Verification: Pending -> In progress -> Done.
  - node --test acceptance.cjs: one invocation, exit 0, 1 passed / 0 failed; TEMP and TMP set to fixture directory for the process.
  - Inline node targeted checks: one invocation, exit 0; nested runtime copy, nested .env.local and private.key exclusion, invalid binding without destination creation, source-contained destination rejection, empty migrations without destination creation passed.

Limitations: This fixture does not certify the original installer, Matrix, capture, API or UI. Secret omission is filename based; no secret-content scan. Runtime filesystem failures during copying can leave a partial destination. No savings, costs or human review claimed. acceptance.cjs and package.json unchanged.
