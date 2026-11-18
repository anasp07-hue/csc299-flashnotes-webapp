# 0005. Storage availability check and in-memory fallback

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
Phase 5 asks for a one-line warning when `localStorage` is unavailable (for example, in some private browsing modes). Two problems come with that:
- **Detecting it up front:** the warning is most useful before the user types a whole set. That means trying a write when the app starts. Reading alone isn't enough: in some browsers reads work but every write throws.
- **What Save does afterwards:** until now, a failed save showed an error and discarded the set. Once the app has warned "sets won't be saved", it would be odd for it to refuse to make any sets at all.

ADR 0002 says all storage access goes through `loadSets()` and `saveSets()`.

## Decision
- Add `storageAvailable()` to the Storage section of `app.js`.
  - It writes and removes a separate probe key, `flashnotes.probe`, never touching `flashnotes.sets`.
  - It returns true or false and never throws.
  - `init()` calls it once and shows the warning if it returns false.
  - It is the only storage access outside `loadSets()` / `saveSets()`.
- `saveSets(sets)` still returns `false` when the browser refuses a write. It now also keeps the sets as JSON in an in-memory variable (`memoryCopy`).
- While `memoryCopy` is set, `loadSets()` reads from it, so creating, editing, studying, testing and deleting all keep working for the rest of the session.
- A later successful save clears `memoryCopy` and goes back to real storage.
- The UI shows the warning whenever `storageAvailable()` is false at startup or any save returns false.

## Alternatives considered
- **Only show the warning, and keep refusing to save:** this matches the spec's wording but leaves the app unusable in that browser.
- **Probe by re-saving the current data with `saveSets(loadSets())`:** this stays inside the two functions, but if the stored data is corrupt, `loadSets()` returns `[]`. Saving that back would wipe data that might still be recoverable.
- **Keep the fallback copy in the UI `state` instead:** the UI calls `loadSets()` in many places, so every one of them would need to know about the fallback.

## Consequences
- In a browser that blocks storage, the app works for one session, and a visible warning says sets will be lost when the page closes.
- The storage rule in ADR 0002 / `CLAUDE.md` now has one documented exception: `storageAvailable()`.
- Tests that simulate broken storage must reset `memoryCopy` afterwards. `tests.js` does this with `withBrokenStorage()`.
