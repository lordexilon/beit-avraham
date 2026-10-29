# SCA local journal

Scope: N12 fixture only. Implement mount and a dependency-free browser demonstration. No network, Matrix writes, deployment, or acceptance/package edits.

Context: TASK.md specifies exclusive click/keyboard selection, aria-pressed, temporary line notes and literal text. SCA_PROTOCOL.md selects local workflow-only persistence. study.cjs is a placeholder; acceptance.cjs checks the public select/note/getState contract.

Plan and transitions:
- N12.1 Context and plan: Pending -> In progress -> Done. Reviewed the four relevant local files.
- N12.2 Implementation and browser demo: Pending -> In progress.
- N12.3 Verification: Pending. Run unchanged acceptance tests and targeted interaction/state tests; inspect responsive markup and safety.

Limitations: No human review or cost/savings claims. Browser visual QA will be recorded only if actually performed.

Completion transitions:
- N12.2 Implementation and browser demo: In progress -> Done. mount uses native buttons (Tab/Enter/Space activation), exclusive aria-pressed updates, textContent, textarea input listeners, validated IDs and defensive state snapshots. index.html loads the same implementation directly, without dependencies. All notes are mount-local and temporary.
- N12.3 Verification: Pending -> In progress -> Done.

Verification evidence:
1. node --test acceptance.cjs: exit 0, 1 passed, 0 failed.
2. node --test acceptance.cjs study.test.cjs: exit 0, 4 passed, 0 failed. Checks click exclusivity, literal HTML, note input persistence, state isolation, unknown/duplicate IDs, empty input, prototype-like IDs, and execution of the demo inline script using the browser export in a VM.
3. Reviewed viewport and CSS: width constrained to available space, border-box, wrapped button text, full-width controls and visible focus. This is source inspection, not rendered 320px/desktop verification.

Changed files: study.cjs; index.html (new); study.test.cjs (new); SCA_JOURNAL.md (new). Existing acceptance.cjs and package.json preserved.

Limitations: No real browser rendering or physical Tab/Enter/Space interaction performed; native keyboard behavior relies on semantic button elements. VM execution does not establish visual QA. No human approval, deployment, remote persistence or financial measurements claimed.
