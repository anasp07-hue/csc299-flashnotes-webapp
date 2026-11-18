# Handoff: Phase 3 — Test mode

- **Date:** 2026-11-18
- **Phase status:** Done

## What was done
- New logic in `app.js` (pure; sessions are memory only, per ADR 0003):
  - `shuffle(arr, rand?)` is Fisher–Yates. `rand` can be injected for tests.
  - `cardSides(card, side)` returns the prompt and answer for the chosen side.
  - `startTest(cards, side, rand?)` creates a session: `{ side, cards, index, revealed, results }`.
  - `revealAnswer` shows the answer.
  - `gradeCard(s, gotIt)` is ignored until the answer is revealed and after the last card, so a card can't be graded twice.
  - `isTestDone(s)` says whether every card has been graded.
  - `testView(s)` returns what the Test view shows.
  - `testScore(s)` and `formatScore(score)` give "7 / 10 (70%)".
  - `missedCards(s)` returns the missed cards.
  - `retryMissed(s, rand?)` starts a new test with only the missed cards, same side, reshuffled.
- UI:
  - a **Test** button on each Home row;
  - a Test setup view (two radio choices, Start test / Cancel);
  - a Test view (prompt, progress, Reveal answer, Got it / Missed it shown only after reveal, Quit test with `confirm()`);
  - a Results view (score, missed cards with both sides, Retry missed (N) hidden when 0, Test again, Back to sets).
- Keyboard: the single `keydown` listener now sends Study keys to `onStudyKey` and Test keys to `onTestKey`.
  - Test: Space reveals, with `preventDefault`, and blurs any focused button first.
  - 1 = Got it and 2 = Missed it. They only work after reveal and are ignored on key repeat.
- Fix (Phase 1 code): `sortNewestFirst` now breaks `createdAt` ties by storage order, so the later-added set is listed first. Found when two sets created in the same millisecond by a script listed in the wrong order. Test added.
- 17 new tests (47 total).

## Current state
- Tests: 47 passing / 0 failing in `tests.html`, run in headless Chrome.
- Acceptance criteria: Phase 3 boxes ticked in `SPEC.md`. They were verified by a scripted headless-Chrome run (39 checks). It covers:
  - front and back side tests;
  - grade buttons hidden until reveal;
  - the score matching Got it clicks;
  - retrying until there are no misses, after which Retry is hidden;
  - retry keeping the side;
  - Quit with both confirm answers;
  - order varying across runs;
  - nothing about tests saved.

  The Phase 1 and 2 page checks and the reload check were re-run and pass. There are no console errors.
- Committed? yes (Phase 3 commit, pushed to `origin/main`)

## What's next
1. Phase 3 is confirmed and committed.
2. Phase 4 (Edit a set): run `/backend-architect` first. It touches storage via `updateSet`.

## Open questions / blockers
- None.

## Decisions made (link ADRs)
- No new ADRs. No data model or storage change.
- The test setup defaults to "Show front" each time it opens. The spec doesn't say whether to remember the last choice, so it doesn't.
- Grading happens only by clicking **Got it** / **Missed it** or pressing **1** / **2** (as the on-screen hint says). After Reveal, focus is released rather than moved to a grade button, so a stray Enter can't grade a card. Space also releases focus, so it can't press a grade button either. After grading, focus returns to **Reveal answer**.
