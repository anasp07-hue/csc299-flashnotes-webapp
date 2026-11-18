# FlashNotes — Spec

## Overview

FlashNotes is a browser-based flashcard app built with plain HTML, CSS and JavaScript. It does one thing: help you study with note cards. You can create a set of cards, delete a set, flip through a set, and test yourself on either side of the cards.

See `problem.md` for the motivation: most flashcard apps are paid or are full of features that get in the way of studying.

## Guiding principles

- **Studying comes first.** Every feature must help you create cards or review them. If it doesn't, leave it out.
- **No build step.** You run the app by opening `index.html` in a browser. There are no frameworks, no npm and no server.
- **Minimal UI.** Use one column, readable text and obvious buttons. Don't add animations beyond a simple card flip.
- **Data stays local.** Sets are stored in the browser's `localStorage`.

## Non-goals (for all phases)

These are out of scope for every phase:

- user accounts, login or cloud sync
- images, audio or rich text on cards (cards are plain text)
- spaced repetition, streaks, statistics history or gamification
- sharing, import/export, folders and tags
- any frameworks or libraries (React, jQuery, Bootstrap, etc.)

## Tech and file layout

```
index.html   – the single page; each screen is a <section> that is shown or hidden
style.css    – all styles
app.js       – all logic (state, storage, rendering, event handlers)
tests.html   – opens in a browser and runs the automated tests (see ADR 0004)
tests.js     – a tiny test harness plus each phase's tests
```

- Inside `app.js`, keep the **logic functions** (storage, validation, navigation, shuffling, scoring) separate from the **DOM code**, so that `tests.js` can call the logic directly.
- `app.js` connects itself to the page only when it finds the `#app` element.
- Load scripts as classic `<script>` tags, not ES modules. Chrome blocks `type="module"` scripts opened from `file://`.

- This is a single-page app. Only one "view" (section) is visible at a time, and `app.js` switches between them.
- Use plain DOM APIs (`document.querySelector`, `addEventListener`, `textContent`).
- **Always insert user text with `textContent`, never `innerHTML`.** This keeps any HTML that a user types into a card from being run.

## Data model

```js
// One set
{
  id: "s_mhz3k2a1x7f9q",   // unique string, see "Unique ids" below
  name: "Spanish Verbs",
  createdAt: 1731961234567, // ms since epoch
  cards: [
    { id: "c_1731961234600", front: "hablar", back: "to speak" },
    ...
  ]
}
```

- **Storage key:** `flashnotes.sets`. Its value is a JSON array of sets.
- **Storage helpers:** `app.js` has two small functions, `loadSets()` and `saveSets(sets)`. All other code goes through them.
- **Bad data:** if `localStorage` is empty, or holds data that won't parse, `loadSets()` returns `[]` and does not crash.
- **Unique ids:** ids must be unique even when several cards are created in the same millisecond. Use a timestamp plus a random suffix, or a counter; `Date.now()` alone is not enough.

## Screens

| View | Purpose | Added in |
|---|---|---|
| Home | Lists all sets; buttons for "New set", and Study / Test / Delete on each set | Phase 1 |
| Create set | Form for the set name and its cards | Phase 1 |
| Study | Flip through the cards one at a time | Phase 2 |
| Test setup | Choose which side to be shown | Phase 3 |
| Test | Self-graded quiz | Phase 3 |
| Results | Score, retry missed cards | Phase 3 |
| Edit set | Change an existing set | Phase 4 |

---

## Phase 1 — Create, list and delete sets

**Goal:** build the app skeleton and the full lifecycle of a set: create it, see it, delete it. Sets persist across page reloads.

### Scope

1. **Skeleton:** `index.html`, `style.css` and `app.js`, plus the view-switching function (`showView(name)`).
2. **Storage:** `loadSets()` and `saveSets()` as described in the data model.
3. **Home view:**
   - App title "FlashNotes" and a **New set** button.
   - A list of sets, newest first. Each row shows the set name, the card count (e.g. "12 cards") and a **Delete** button. (The Study and Test buttons are added in later phases.)
   - If there are no sets, show "No sets yet — create one to get started."
4. **Create set view:**
   - A text input for the **set name**.
   - A list of card rows. Each row has a **Front** textarea, a **Back** textarea and a **Remove** button. The form starts with 3 empty rows.
   - An **Add card** button that appends an empty row and focuses its Front field.
   - **Save** and **Cancel** buttons.
5. **Validation when you click Save:**
   - The set name is required (after trimming whitespace).
   - Rows where both sides are blank are ignored.
   - A row with only one side filled in is an error. Highlight that row and show a message.
   - At least 1 complete card is required.
   - Show errors inline on the page, not with `alert()`.
6. **Delete:** clicking Delete asks "Delete '<name>'? This can't be undone." using `confirm()`. If you confirm, the set is removed from storage and the list re-renders.
7. **Test harness:** add `tests.html` and `tests.js` with `test`, `assert` and `assertEqual`, a pass/fail list, and backup and restore of `flashnotes.sets`.

### Automated tests
- `loadSets()` returns `[]` when storage is empty and when it holds invalid JSON.
- Saving with `saveSets()` and then calling `loadSets()` returns the same data.
- Validation:
  - rejects an empty name or a name that is only whitespace,
  - rejects a set with zero cards,
  - rejects a card with only one side filled in,
  - ignores rows where both sides are blank,
  - trims whitespace.
- Creating a set gives it a unique `id` and a `createdAt`. Deleting a set removes only that set.

### Acceptance criteria

- [x] Opening `index.html` directly from the file system works, with no console errors.
- [x] You can create a set with 3 cards, and it appears on Home with "3 cards".
- [x] After a page refresh, the set is still there.
- [x] Saving with an empty name, with zero cards, or with a half-filled card shows an error and saves nothing.
- [x] Cancel returns to Home without saving.
- [x] Deleting a set removes it after confirmation. Choosing Cancel in the dialog keeps it.
- [x] Typing `<b>hi</b>` as a set name or card text displays those characters literally; the text does not turn bold.

---

## Phase 2 — Study mode (flip through a set)

**Goal:** let you review a set card by card, flipping each card to see the other side.

### Scope

1. Add a **Study** button to each set on Home.
2. **Study view:**
   - A header with the set name and a **Back to sets** button.
   - One large card showing the **front** first.
   - Clicking the card, or pressing **Space**, flips it to show the back. Flipping again shows the front.
   - **Prev** and **Next** buttons. Moving to another card always shows that card's front first.
   - A position indicator, e.g. "Card 3 of 10".
   - Prev is disabled on the first card and Next is disabled on the last card. Navigation does not wrap around.
   - Keyboard: **←** goes to the previous card, **→** goes to the next card, **Space** flips.
   - A small label on the card says which side is showing ("Front" / "Back").
3. **Flip effect:** a simple CSS flip (a 3D rotate) or a plain swap of the text. Either is acceptable; keep it under about 300 ms.
4. **Long text:** a long card's text wraps and scrolls inside the card without breaking the layout.

### Automated tests
- Study starts at index 0, showing the front.
- Next and Prev stay within bounds: they don't move past the first or last card.
- Moving to another card resets the view to the front.
- Flipping toggles between the front and the back.

### Acceptance criteria

- [x] Study opens on card 1, showing the front.
- [x] Clicking the card or pressing Space toggles between the front and the back.
- [x] Next and Prev move between cards and reset to the front. The buttons disable at the ends.
- [x] The arrow keys work. Pressing Space does not scroll the page.
- [x] Back to sets returns to Home.

---

## Phase 3 — Test mode

**Goal:** let you quiz yourself on either side of the cards, grade yourself, see a score, and retry the cards you missed.

### Scope

1. Add a **Test** button to each set on Home.
2. **Test setup view:**
   - The prompt "Which side do you want to be shown?"
   - Two choices: **Show front (answer with back)** and **Show back (answer with front)**.
   - A **Start test** button and a **Cancel** button.
3. **Test view:**
   - The cards are **shuffled** at the start of every test, using a Fisher–Yates shuffle.
   - Show the chosen prompt side of the current card, plus a progress indicator such as "Card 4 of 10".
   - A **Reveal answer** button (or the **Space** key) shows the other side underneath the prompt.
   - After the answer is revealed, two buttons appear: **Got it** and **Missed it**. Keyboard shortcuts: **1** = Got it, **2** = Missed it.
   - Grading a card moves to the next card. You cannot go back to a card you have already graded.
   - A **Quit test** button returns to Home after `confirm()`. Quitting does not show results.
4. **Results view:**
   - The score as a fraction and a percentage, e.g. "7 / 10 (70%)".
   - A list of the missed cards, showing both sides of each.
   - **Retry missed (3):** starts a new test using only the missed cards, with the same side choice and reshuffled. This button is hidden when nothing was missed.
   - **Test again:** runs the full set again with the same side choice.
   - **Back to sets:** returns to Home.
5. Test progress is kept in memory only. Nothing about tests is saved to `localStorage`.

### Automated tests
- The shuffle returns the same cards in some order, the same number of cards, and does not change the original array.
- For the chosen side, the prompt and answer come from the correct fields (front/back or back/front).
- Grading "Got it" and "Missed it" produces the correct score and the correct list of missed cards.
- A retry session contains only the missed cards and keeps the same side choice.
- A card can't be graded twice, and the session ends after the last card.

### Acceptance criteria

- [x] A test on the front side shows fronts as prompts and reveals backs. A test on the back side does the reverse.
- [x] Card order differs between runs. This is random, so check it with a set of at least 5 cards.
- [x] The Got it / Missed it buttons are not available until the answer is revealed.
- [x] The score shown at the end matches the number of "Got it" clicks.
- [x] Retry missed tests only the missed cards. Retrying repeatedly eventually reaches a score with no misses, and then the Retry button is hidden.
- [x] Quitting mid-test returns to Home after confirmation.

---

## Phase 4 — Edit a set

**Goal:** change an existing set without deleting it and starting over.

### Scope

1. Add an **Edit** button to each set on Home.
2. The **Edit set view** reuses the Create form, pre-filled with the set's name and cards.
   - You can rename the set, change card text, remove cards and add cards.
   - The same validation rules as Create apply.
   - **Save** updates the set in place. Its `id` and `createdAt` stay the same.
   - **Cancel** discards all changes.
3. Existing cards keep their card `id`. New cards get new ids.

### Automated tests
- Updating a set keeps its `id` and `createdAt`.
- Existing cards keep their ids, and new cards get new, unique ids.
- Removed cards are gone from the saved set.
- An invalid edit is rejected and leaves the stored set unchanged.

### Acceptance criteria

- [ ] Editing a card's text and saving updates it in Study and in Test.
- [ ] Adding and removing cards updates the card count on Home.
- [ ] Cancel leaves the set exactly as it was.
- [ ] An edit that breaks validation (for example, removing every card) is blocked with an error.
- [ ] Edits persist after a page refresh.

---

## Phase 5 — Polish (optional)

These small improvements are only worth doing if Phases 1–4 are done and working. Each item is independent.

- **Responsive layout:** the app is usable on a phone-width screen (about 375 px).
- **Dark mode:** follows `prefers-color-scheme`.
- **Focus and accessibility:** visible focus outlines, buttons are real `<button>` elements, and the card in Study is focusable and announces its side to screen readers.
- **Empty and edge states:** a set with exactly 1 card works in Study and in Test.
- **Storage failure:** if `localStorage` is unavailable (for example, in some private browsing modes), show a one-line warning saying sets won't be saved.

---

## Done checklist (run after each phase)

Before starting a phase, run `/backend-architect` to plan its logic functions and tests.

0. Run `/phase-review N` and fix any blockers it finds.
1. Open `tests.html`. Every test, including those from earlier phases, should pass.
2. Open `index.html` with the browser console open. There should be no errors.
3. Go through that phase's acceptance criteria by hand.
4. Re-check the acceptance criteria from earlier phases to catch regressions.
5. Refresh the page and confirm that the data persisted.
6. Write a handoff in `docs/handoffs/`, and an ADR for any new decision.
