# Handoff: Phase 2 — Study mode

- **Date:** 2026-11-18
- **Phase status:** Done

## What was done
- New logic in `app.js` (pure, memory only):
  - `findSet(sets, id)` finds a set by id.
  - `startStudy(set)` creates a session: `{ name, cards, index, flipped }`.
  - `studyFlip` switches sides.
  - `studyNext` / `studyPrev` move one card, clamped, and reset to the front.
  - `studyView(session)` returns text, side label, "Card i of n", and canPrev/canNext.
- **Study** button on each Home row.
- Study view in `index.html`:
  - header with the set name and **Back to sets**;
  - a large card (`div` with `role="button"`, `tabindex="0"`) with a Front/Back label;
  - Prev/Next and a position indicator.
- Flip effect is a 200 ms CSS rotateY. Long text wraps and scrolls inside a fixed-height (280px) card.
- Keyboard: one `keydown` listener registered in `init()`. It only acts when `state.view === 'study'`.
  - Space flips and calls `preventDefault` (no scroll). If another element has focus, Space blurs it first so a focused button isn't also clicked on keyup.
  - ← and → move between cards.
- 9 new tests in `tests.js` (30 total).

## Current state
- Tests: 30 passing / 0 failing in `tests.html`, run in headless Chrome.
- Acceptance criteria: Phase 2 boxes ticked in `SPEC.md`. They were checked by a scripted headless-Chrome run (23 checks): flip by click and Space, nav buttons and arrows, disabled ends, no wrap, Back to sets, keys ignored outside Study, the listener doesn't pile up, reopening resets, long text, and HTML shown literally. The Phase 1 page checks were re-run and still pass. There are no console errors.
- Committed? yes (Phase 2 commit, pushed to `origin/main`)

## What's next
1. User confirms Phase 2 (optionally a real-keyboard try of Space while Prev/Next has focus; scripted events can't trigger a native button click).
2. Commit Phase 2 when asked.
3. Phase 3 (Test mode): run `/backend-architect` first.

## Open questions / blockers
- None.

## Decisions made (link ADRs)
- No new ADRs. No data model or storage change; the study session is memory only.
- Pressing Enter on the focused study card doesn't flip it (only click/Space do). It can be added in Phase 5 accessibility if wanted.
