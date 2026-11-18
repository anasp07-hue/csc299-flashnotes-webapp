# 0002. Store sets in localStorage

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
Card sets need to survive a page refresh. There is no server, and accounts and sync are non-goals.

## Decision
Store all sets as one JSON array under the `localStorage` key `flashnotes.sets`. All access goes through `loadSets()` and `saveSets(sets)` in `app.js`. If the stored data is missing or can't be parsed, `loadSets()` returns `[]`.

## Alternatives considered
- **No saving:** sets would be lost on every refresh, which defeats the purpose.
- **localStorage plus JSON export/import:** useful for backups, but not needed yet. It can be added later in its own ADR.
- **IndexedDB:** more capable, but its API is more complex than this amount of data needs.

## Consequences
- Data belongs to one browser on one device. Clearing site data deletes the sets.
- localStorage holds roughly 5 MB, which is plenty for text cards.
- Pages opened from `file://` may share a single localStorage, so `tests.html` must back up and restore `flashnotes.sets` (see 0004).
