# Handoff: Phase 5 — Polish (all items except responsive layout)

- **Date:** 2026-11-18
- **Phase status:** Done

## What was done
- **Dark mode:**
  - all colors are CSS variables on `:root`, with dark values under `@media (prefers-color-scheme: dark)`;
  - `<meta name="color-scheme" content="light dark">` makes form controls and scrollbars match.
- **Focus and accessibility:**
  - global `:focus-visible` outline;
  - every action is a real `<button>`;
  - Home row buttons have names that include the set name ("Study Spanish Verbs");
  - the Study card (`role="button"`, `tabindex="0"`) no longer has an `aria-label` hiding its text, and is described by the hint text;
  - Enter on the focused card flips it;
  - a polite, visually hidden live region (`#live`, `announce()`) reports each study flip or move, test prompt, revealed answer and final score;
  - form errors set `aria-invalid` on the bad fields.
- **Edge states:**
  - a 1-card set works in Study (both buttons disabled) and in Test (one grade finishes; retry works);
  - a 0-card set, which can only come from damaged data, has Study and Test disabled on Home.
- **Storage failure** (ADR 0005):
  - `storageAvailable()` writes and removes a probe key at startup;
  - `saveSets` keeps an in-memory copy when the browser refuses a write, and `loadSets` reads that copy, so the app keeps working for the session;
  - a one-line warning (`#storage-warning`) shows when the probe fails or any save fails.
- 8 new tests (65 total).
- Responsive layout was **not** done, by the user's choice. It's marked unchecked in `SPEC.md`.

## Current state
- Tests: 65 passing / 0 failing in `tests.html`, run in headless Chrome.
- Scripted headless-Chrome checks (scratchpad pages, not in the repo):
  - Phase 5 page: all checks pass in both forced light and forced dark mode. They cover edge states, Enter-to-flip, live-region text, `aria-invalid`, the focus rule, real buttons, and contrast of 7 key text/background pairs (all ≥ 4.5:1 in both themes).
  - Writes refused and storage blocked entirely: the warning shows, and create/study/edit/delete still work for the session.
  - Phase 1–4 page checks and the reload check re-run and pass. No console errors.
- Committed? yes. Phase 4 and Phase 5 are separate commits, pushed to `origin/main`.

## What's next
1. Optional: responsive layout, if wanted later.

## Open questions / blockers
- None. `CLAUDE.md` and the `backend-architect` and `phase-review` skills now name the `storageAvailable()` exception to the storage rule (ADR 0005).

## Decisions made (link ADRs)
- Dark mode follows the system setting only, with no in-app toggle. The user confirmed they prefer this.
- [ADR 0005](../adr/0005-storage-failure-fallback.md): storage availability check and in-memory fallback.
- Screen-reader announcements go through one live region (`announce()`) rather than making the cards themselves live regions.
