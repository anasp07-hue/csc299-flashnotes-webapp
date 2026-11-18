# Handoff: Phase 4 — Edit a set

- **Date:** 2026-11-18
- **Phase status:** Done

## What was done
- New logic: `updateSet(sets, id, draft)` returns `{ ok, value: newSets }` or `{ ok: false, errors }`.
  - It uses the same `validateSet` as Create.
  - It keeps the set's `id`, `createdAt` and position in the array.
  - A card keeps its id only if that id already belongs to this set and isn't used twice in the draft. Otherwise it gets a new `newId('c_')`.
  - A missing set id gives a `field: 'set'` error.
  - It doesn't change its input.
- UI:
  - an **Edit** button on each Home row;
  - the Create form is reused through `renderSetForm(set | null)`, with the title "New set" / "Edit set" (`#form-title`);
  - card rows carry `data-card-id`, and `readDraft()` passes it through;
  - `state.editingId` decides whether Save creates or updates;
  - Cancel (`onCancelSetForm`) saves nothing and clears `editingId`.
- 10 new tests (57 total).

## Current state
- Tests: 57 passing / 0 failing in `tests.html`, run in headless Chrome.
- Acceptance criteria: Phase 4 boxes ticked in `SPEC.md`. They were verified by a scripted headless-Chrome run (24 checks) plus a reload check. Covered:
  - edited text shows in Study and in Test;
  - adding and removing cards updates the Home count;
  - Cancel leaves storage byte-for-byte unchanged;
  - removing every card, an empty name or a half-filled card is blocked with an error;
  - edits persist after a reload;
  - `id`, `createdAt` and kept card ids are preserved;
  - New set after an Edit gives a fresh form and creates a new set.

  The Phase 1–3 page checks were re-run and pass. There are no console errors.
- Committed? yes (Phase 4 commit, pushed to `origin/main`)

## What's next
1. Phase 4 is confirmed and committed.
2. Phases 1–4 (all required phases) are done. Phase 5 (Polish) is optional; each item is independent. Ask the user which, if any, to do.

## Open questions / blockers
- None.

## Decisions made (link ADRs)
- No new ADRs. No data model or storage change.
- Card ids sent from the form are only kept if they already belong to the set being edited, so a stale or duplicated id can't create two cards with the same id.
