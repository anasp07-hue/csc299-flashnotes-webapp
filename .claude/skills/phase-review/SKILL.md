---
name: phase-review
description: Review a FlashNotes phase before it is called done. Checks the work against the phase's scope, tests and acceptance criteria in SPEC.md, the rules in CLAUDE.md, and looks for correctness bugs. Use when a phase is finished or nearly finished, or when the user asks for a review. Optional argument is the phase number (e.g. "2").
---

# Phase review

Review the current phase and report whether it is ready to call done. **Report only. Do not fix anything unless the user asks you to.**

## 1. Gather context

1. Work out which phase to review:
   - Use the phase number passed as an argument, if there is one.
   - Otherwise, use the newest file in `docs/handoffs/`.
   - If neither tells you, ask the user.
2. Read `CLAUDE.md`, and that phase's section of `SPEC.md` (Scope, Automated tests, Acceptance criteria). Also read the Non-goals and the Data model.
3. Run `git status` and `git diff`, and include untracked files. Then read `index.html`, `style.css`, `app.js`, `tests.html` and `tests.js` in full. The project is small enough to do this.

## 2. Check each area

### Scope
- Is every item in the phase's Scope list implemented?
- Has anything been built that belongs to a later phase or to the Non-goals? Flag it, even if it works.

### CLAUDE.md rules
Search the code to check each rule:
- **No dependencies:** look for `src="http`, `href="http`, `import `, `require(`, `type="module"` and any `package.json`. All of these should be absent.
- **Safe rendering:** search for `innerHTML`, `outerHTML` and `insertAdjacentHTML`. Any of these with user data is a **blocker**.
- **Storage:** search for `localStorage`. Outside `loadSets` and `saveSets` it may appear only in the tests' backup and restore code.
- **Logic and DOM kept apart:** logic functions must not touch `document`. The UI should be connected only when `#app` exists.

### Tests
- Does every bullet under the phase's "Automated tests" have at least one matching test? List any that are missing.
- Do the tests back up and restore `flashnotes.sets`, even when a test throws?
- Are earlier phases' tests still present? Make sure none were deleted to get a pass.
- **Run the tests:**
  - If browser tools are available, open `tests.html` and read the pass/fail totals.
  - Otherwise, ask the user to open it and tell you the totals.
  - Never report tests as passing if you didn't see them pass.

### Acceptance criteria
For each criterion, report one of:
- ✅ covered by an automated test,
- 🔍 checked by reading the code, or
- 👤 needs a manual check by the user.

### Correctness bugs
These are common in this app, so check each one:
- **Keyboard handlers:** shortcuts (Space, arrow keys, 1/2) fire only in their own view and don't pile up each time a view is opened. Space must not scroll the page or activate a focused button twice.
- **Stale state:** opening a set again, retrying a test, or switching sets resets the index, the flipped/revealed state and the score.
- **IDs:** ids created in the same millisecond (for example, several cards saved at once) must still be unique.
- **Edge cases:**
  - a set with 1 card,
  - empty storage,
  - corrupted JSON in storage,
  - very long card text,
  - set names or card text containing `<`, `>` and `&`,
  - a set that is deleted while it's open.
- **Persistence:** every change that should persist calls `saveSets`, and the UI re-renders from the saved data.

### Git and docs
- `git status` shows no secrets, `.env*` files, `.DS_Store` or `.claude/settings.local.json` ready to be committed.
- Every new decision in this phase has an ADR, and `docs/adr/README.md` lists it.
- A handoff for this phase exists, or say that one is still needed.

## 3. Report

Use this format:

```
## Phase N review: READY | NOT READY

Tests: X passed / Y failed (seen in browser | reported by user | not run)

### Findings
1. [blocker|should-fix|nit] file:line — what's wrong. Why it matters. Suggested fix.
...

### Acceptance criteria
| Criterion | Status |
|---|---|

### Still to do before calling the phase done
- ...
```

Mark the phase **NOT READY** if any of these is true:
- there are blockers,
- any test fails or hasn't been run, or
- part of the phase's scope is missing.

Keep nits to a few at most. Don't pad the report.
