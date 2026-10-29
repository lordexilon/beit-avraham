# SCA journal — N12

Scope: implement mount(container, lines) and a responsive browser demonstration. Only this fixture was written; acceptance.cjs and package.json were not edited. All substeps authorized.

Context: TASK.md defines single selection, keyboard access, aria-pressed, temporary per-line notes and literal text. SCA_PROTOCOL.md workflow-only-v1 requires this local journal; no remote Matrix, root CLI, retrieval or swarm was used.

Plan / dependency order and transitions:
1. Inspect fixture — Pending → In progress → Done. Read TASK.md, SCA_PROTOCOL.md, study.cjs, acceptance.cjs, package.json.
2. Implement shared module and demo — Pending → In progress → Done. study.cjs exports CommonJS mount and browser Study.mount. index.html uses that same module, native buttons, a labeled textarea and responsive CSS.
3. Verify and review limitations — Pending → In progress → Done. Checked actual implemented DOM behavior with fixture tests and focused additional tests.

Verification invocations:
- node --test acceptance.cjs: one invocation, exit 0, 1 test passed, 0 failed.
- node --test verification.cjs: one invocation, exit 0, 2 tests passed, 0 failed. Covers click events, exclusive aria-pressed, literal unsafe-looking text, editor input, restored notes, isolated state snapshots, unknown ids and duplicate validation before DOM replacement.

Review: selection updates all buttons; notes use an own-key-safe map and state snapshots; all supplied text uses textContent or textarea.value. Native button activation supports Tab/Enter/Space. No dependencies added.

Limitations: no real-browser visual or keyboard execution was performed; 320px/desktop layout is source-reviewed only. Browser demo loads study.cjs as a classic script; an HTTP server must permit its JavaScript MIME type, or open index.html locally. Notes are intentionally in-memory and reset on reload. No baseline, savings, costs, external evidence or human review claimed.

Interruption: parent reported a usage-limit interruption and authorized continuing. This is separate from task difficulty; no test failure or implementation blocker occurred.

## Additional failed attempt and correction (same benchmark)

External acceptance review reported that the browser demo did not render controls: SyntaxError and stray JavaScript text. Earlier Done did not establish browser acceptance; preserve the earlier test evidence above, but reopen demo verification.

Correction plan: Pending → In progress → Done. Inspect index.html script boundary, reproduce with a regression test, escape HTML-sensitive characters in the inline sample, then reverify. The sample contained a literal closing script tag; HTML terminates script content even when the tag is inside a JavaScript string. index.html now uses Unicode escapes for the less-than characters while retaining the exact displayed literal text.

Additional invocations, in order:
1. node --test verification.cjs before the fix: exit 1; 2 passed, 1 failed. New regression found 3 closing script tags instead of 2. This reproduces the failed boundary rather than hiding the unsuccessful attempt.
2. node --test acceptance.cjs after the fix: exit 0; 1 passed, 0 failed.
3. node --test verification.cjs after the fix: exit 0; 3 passed, 0 failed. The regression extracts script blocks using HTML closing boundaries, loads the actual study.cjs browser branch in Node VM, executes the actual inline initialization, verifies three rendered controls and exact literal script-like text, and exercises selection.

Cumulative command counts: acceptance.cjs 2 invocations (both passed); verification.cjs 3 invocations (initial passed, regression reproduction failed, correction passed). External real-browser review had one failed attempt. acceptance.cjs and package.json remain unchanged.

Limits: this correction was validated with HTML boundary checks and actual scripts in a simulated DOM, not a real browser. No real-browser proof or 320px/desktop visual acceptance claimed. The external defect report is supplied evidence from the parent. Usage interruption remains separately recorded; this defect was an implementation error.
