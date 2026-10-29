# N12 — Study component
Scope: implement mount and responsive demo, with no dependencies or unsafe HTML.
Context: TASK.md, SCA_PROTOCOL.md, study.cjs, acceptance.cjs, package.json.
Plan: N12.1 inspect → N12.2 implement → N12.3 demo and verification.
Transitions:
- N12.1 Pending → In progress → Done: inspected local contract and placeholder.
- N12.2 Pending → In progress: implementation started.
- N12.3 Pending: depends on implementation.
Verification pending. No human review, browser QA or savings claimed.
- N12.2 In progress → Done: native buttons, exclusive aria-pressed selection, Enter/Space activation, safe textContent rendering, per-line in-memory notes and state API implemented. Input ids validated.
- N12.3 Pending → In progress: created index.html loading the actual study.cjs implementation, with responsive widths and visible focus styles.
- N12.3 In progress → Done: checked code and demo inline execution using local DOM doubles.
Verification invocations (each once):
- node --test acceptance.cjs: exit 0; 1 passed, 0 failed.
- node --check study.cjs: exit 0.
- node --test verification.cjs: exit 0; 3 passed, 0 failed. Covers click, keyboard, aria state, note restoration, literal markup, state isolation, empty/invalid ids, special ids and actual browser demo code execution.
Limitations: DOM-double tests do not prove rendered browser layout or native Tab behavior. Manual browser QA at 320px and desktop is unperformed. Responsive CSS and native buttons were reviewed statically. acceptance.cjs and package.json were not changed. Notes intentionally reset on reload. No external writes or measurements performed.
