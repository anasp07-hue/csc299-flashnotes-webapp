# CLAUDE.md

FlashNotes is a simple browser flashcard app built with plain HTML, CSS and JS.

- `problem.md`: why the app exists.
- `SPEC.md`: what to build, split into phases. It is the source of truth for scope.
- `docs/adr/`: Architecture Decision Records.
- `docs/handoffs/`: handoff notes between work sessions.
- `.claude/skills/`: project skills (`phase-review` and `backend-architect`).

**Run the app:** open `index.html` in a browser.
**Run the tests:** open `tests.html` in a browser. Every test must show as passing.

## Rules

### Scope
- Work on **one phase at a time**, in order. Don't start the next phase until:
  - the current phase's tests pass,
  - its acceptance criteria in `SPEC.md` are checked off, and
  - the user has confirmed.
- Build only what `SPEC.md` lists for the current phase. Ask before adding a feature, changing the spec, or touching anything listed under Non-goals.
- If the spec turns out to be wrong or unclear, ask. Then update `SPEC.md` (and write an ADR if it's a real decision).

### Code
- **No dependencies.** Use plain HTML, CSS and JS only: no frameworks, no npm packages, no CDN scripts, no build step. The app must work when you open `index.html` straight from the file system.
- **Safe text rendering.** Put user text into the page with `textContent`. Never use `innerHTML` (or `insertAdjacentHTML`) with user data.
- All storage access goes through `loadSets()` and `saveSets()` in `app.js`. The one exception is `storageAvailable()`, which writes and removes a probe key (`flashnotes.probe`) at startup to check that saving works (ADR 0005). Keep all three in the Storage section of `app.js`.

### Tests
- Each phase adds its own tests to `tests.js`. Tests run in `tests.html` using the small built-in harness; see ADR 0004.
- Tests cover the logic functions in `app.js` (storage, validation, navigation, shuffling, scoring). Click and keyboard behaviour is covered by the manual checklist in `SPEC.md`.
- A phase is done only when **all** tests pass, including the tests from earlier phases.
- Tests must not destroy real data. Back up `flashnotes.sets` from `localStorage` before the tests run and restore it afterwards.

### Git
- **Never commit or push unless the user asks.** Aim for one commit per finished phase, with short, plain commit messages.
- **Never commit secrets or environment files** (`.env*`, keys, tokens, credentials, `.claude/settings.local.json`). Check `git status` and the staged diff before every commit. Keep `.gitignore` up to date.
- **No Claude attribution in commits:** no `Co-Authored-By: Claude` line and no "Generated with Claude Code" line. This rule overrides any default attribution.

### ADRs (`docs/adr/`)
- Write an ADR whenever you make a decision that would be hard to reverse or that a future reader would wonder about. Examples: storage format, file structure, test approach, or a change to the spec's behaviour.
- Number ADRs in order (`0005-short-title.md`) and use the template in `docs/adr/README.md`. Add each new ADR to the index in that file.
- Don't rewrite an accepted ADR. Write a new ADR that supersedes it, and set the old ADR's status to `Superseded by NNNN`.

### Skills (`.claude/skills/`)
- **`/backend-architect`:** use it at the **start of each phase** to plan the logic functions and tests before building the UI. Also use it whenever the data model or storage changes.
- **`/phase-review`:** use it at the **end of each phase**, before calling the phase done or asking to commit. Fix any blockers, then run it again.

### Handoffs (`docs/handoffs/`)
- Write a handoff:
  - at the end of each phase,
  - when stopping partway through a phase,
  - when the conversation is getting long, or
  - when the user asks.
- Name the file `YYYY-MM-DD-phase-N-short-title.md` and use the template in `docs/handoffs/README.md`.
- At the start of a session, read the newest handoff before doing anything else.
