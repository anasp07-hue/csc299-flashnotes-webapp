# 0001. Plain HTML/CSS/JS with no build step

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
The goal (see `problem.md`) is a flashcard app that is "super simple, no crazy UI, easy to run". The feature set is small: create, delete, study and test.

## Decision
Build the app as three files: `index.html`, `style.css` and `app.js`. Use no frameworks, no npm packages, no CDN scripts and no build step. The app is a single page that shows and hides one `<section>` per view.

## Alternatives considered
- **React/Vue/Svelte:** adds tooling and a build step, which is overkill for this many screens.
- **Several HTML pages:** state would have to be passed between pages, and navigation would feel slower.

## Consequences
- You run the app by opening `index.html`. There is nothing to install.
- View switching and rendering are written by hand, so `app.js` has to stay organised (storage, logic and UI as separate groups of functions).
- User text must be inserted with `textContent` to avoid HTML injection, because there's no framework escaping it automatically.
