# Local SCA journal — N12

Scope: isolated prepare(src, dest, binding) bootstrap fixture; no installer certification or external writes.
Context: TASK.md specifies required scripts/migrations, valid binding, secret exclusion and empty destination. acceptance.cjs checks those basic paths. SCA_PROTOCOL.md authorizes local execution and journal persistence.

Plan registered Pending:
1. Inspect fixture and define validation/copy behavior — Pending.
2. Implement bootstrap with preflight validation — Pending.
3. Run acceptance and focused negative checks — Pending.

Transitions:
- 1: Pending → In progress → Done. Reviewed TASK.md, SCA_PROTOCOL.md, bootstrap.cjs, acceptance.cjs and package.json.
- 2: Pending → In progress. Require nonempty scripts and migrations, a nonblank project name and UUID cycle ID; copy only these directories, exclude secret-like files and reject symlinks. Validate before creating destination.
- 2: In progress → Done. Implemented recursive safe-file inventory, binding whitelist/validation, destination and required-piece preflight, exclusive writes.
- 3: Pending → In progress. Acceptance command: process TEMP/TMP set to fixture directory; node --test acceptance.cjs. Result: exit 0, 1 test passed, 0 failed.
- Focused node -e assertion invocation: exit 0. Verified nested copy, .env.local/private-key exclusion, binding field whitelist, invalid binding rejection without destination creation, source overlap rejection, and empty migrations rejection without destination creation.
- 3: In progress → Done. Acceptance and focused checks passed; inspected resulting implementation.

Limitations: This fixture does not certify the original installer, Matrix, continuous capture, API/UI behavior or human review. Secret filtering is filename based, not content scanning. Filesystem I/O failures during copying can leave a partial destination; preflight validation failures leave it untouched. No network/dependency installation or external persistence used. acceptance.cjs and package.json unchanged.
