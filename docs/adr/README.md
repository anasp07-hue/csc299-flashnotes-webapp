# Architecture Decision Records

An ADR records one decision: the context behind it, what was decided, and the consequences. Accepted ADRs are never rewritten. To change a decision, write a new ADR that supersedes the old one.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-plain-html-css-js-no-build.md) | Plain HTML/CSS/JS with no build step | Accepted |
| [0002](0002-localstorage-persistence.md) | Store sets in localStorage | Accepted |
| [0003](0003-self-graded-test-mode.md) | Self-graded test mode | Accepted |
| [0004](0004-browser-test-runner.md) | In-browser test runner (tests.html) | Accepted |
| [0005](0005-storage-failure-fallback.md) | Storage availability check and in-memory fallback | Accepted |

## Template

Copy this into `NNNN-short-title.md`:

```markdown
# NNNN. Title

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD

## Context
What problem or question needed a decision? What constraints apply?

## Decision
What we chose, stated plainly.

## Alternatives considered
- Option: why it wasn't chosen.

## Consequences
What gets easier, what gets harder, and what we now have to keep in mind.
```
