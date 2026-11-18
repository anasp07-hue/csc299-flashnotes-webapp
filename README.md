# FlashNotes

FlashNotes is a simple flashcard app that runs in your browser. It does one thing: help you study with note cards. There are no accounts, ads or extra features to get in the way.

## What it does

- **Create sets** of cards, each with a front and a back. The form checks that every card has both sides filled in.
- **Study** a set by flipping through it one card at a time. Click the card or press **Space** to flip it, and use **←** / **→** to move between cards.
- **Test yourself** on either side of the cards. The cards are shuffled each time. You reveal the answer, then mark it **Got it** (**1**) or **Missed it** (**2**). At the end you see your score and can **retry only the cards you missed**.
- **Edit** a set to rename it or to add, change or remove cards. **Delete** a set you no longer need.
- Your sets are **saved in the browser** (`localStorage`), so they're still there after you close the page.
- Follows your system's **light/dark mode**, and works with the keyboard and screen readers.

## Run the app

There's nothing to install and no build step. Open `index.html` in a browser.

From the project folder:

```sh
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

You can also double-click `index.html` in your file browser.

## Run the tests

The tests run in the browser. Open `tests.html`:

```sh
open tests.html          # macOS
xdg-open tests.html      # Linux
start tests.html         # Windows
```

The page lists every test as PASS or FAIL, with a total at the top. Every test should pass.

To run the tests from the terminal with headless Chrome (macOS path shown) and print only the total:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --dump-dom "file://$PWD/tests.html" 2>/dev/null \
  | grep -o '<p id="summary"[^>]*>[^<]*' | sed 's/<[^>]*>//'
```

The output looks like `65 passed, 0 failed (65 total)`.

Running the tests won't touch your saved sets. They're backed up before the tests run and restored afterwards.

## Project layout

```
index.html   the app: one page, with one <section> per screen
style.css    all styles (light and dark)
app.js       all logic: storage, validation, study/test logic, rendering
tests.html   opens and runs the automated tests
tests.js     a tiny test harness plus the tests
problem.md   why the app exists
SPEC.md      what was built, phase by phase, with acceptance criteria
docs/adr/    Architecture Decision Records
docs/handoffs/  notes between work sessions
```

The app uses plain HTML, CSS and JavaScript, with no frameworks, libraries or build tools. See `SPEC.md` for the full feature list and `docs/adr/` for the main design decisions.
