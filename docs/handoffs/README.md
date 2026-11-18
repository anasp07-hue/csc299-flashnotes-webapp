# Handoffs

A handoff lets the next session (yours or Claude's) pick up work without having to work out what state things are in.

**When to write one:**
- at the end of each phase,
- when stopping partway through a phase,
- when the conversation is getting long, or
- when asked.

**File name:** `YYYY-MM-DD-phase-N-short-title.md`. The newest file is the current state of the project.

## Template

```markdown
# Handoff: Phase N — short title

- **Date:** YYYY-MM-DD
- **Phase status:** Not started | In progress | Done (awaiting user confirmation) | Done

## What was done
- ...

## Current state
- Tests: X passing / Y failing (open tests.html)
- Acceptance criteria checked: ...
- Committed? yes (hash) / no

## What's next
1. ...

## Open questions / blockers
- ...

## Decisions made (link ADRs)
- ...
```
