# 0004. In-browser test runner (tests.html)

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
Each phase needs automated tests. ADR 0001 rules out npm and test frameworks. The app runs in the browser and uses `localStorage`.

## Decision
- Add `tests.html` and `tests.js`. `tests.js` contains a tiny harness (`test(name, fn)`, `assert(cond, msg)` and `assertEqual(actual, expected, msg)`) and lists each test as pass or fail on the page, with a total at the top.
- `tests.html` loads `app.js` and then `tests.js`.
- In `app.js`, logic is kept in plain functions separate from DOM code: storage, validation, study navigation, shuffling, test scoring and set updates. Tests call these functions directly.
- `app.js` connects itself to the page only if it finds the app's root element (`#app`). `tests.html` has no `#app` element, so loading `app.js` there doesn't try to render the UI.
- Tests back up `flashnotes.sets` from `localStorage` before running and restore it afterwards.
- Click and keyboard behaviour is checked with the manual checklist in `SPEC.md`.

## Alternatives considered
- **Node's built-in `node --test`:** requires Node, and it can't test browser code that uses `localStorage` or the DOM without extra mocking.
- **Both Node and the browser:** two setups to maintain for a small app.
- **Loading `index.html` in an iframe from `tests.html`:** Chrome blocks access between `file://` frames.

## Consequences
- Running the tests just means opening a file. Nothing has to be installed.
- `app.js` has to keep logic separate from rendering, which is a good structure anyway.
- UI wiring isn't covered by automated tests, so the manual checklist still matters.
