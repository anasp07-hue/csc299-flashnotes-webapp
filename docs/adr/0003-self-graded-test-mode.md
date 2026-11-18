# 0003. Self-graded test mode

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
Test mode lets you pick which side of the cards you're shown and answer with the other side. The app needs some way to decide whether each answer was right.

## Decision
You grade yourself. The app shows the prompt side; you reveal the answer, then click **Got it** or **Missed it**. Cards are shuffled at the start of each test. At the end the app shows the score and offers **Retry missed** (only the missed cards, with the same side choice). Test progress lives in memory only and is not saved.

## Alternatives considered
- **Typed answers checked by the app:** breaks on long answers, on synonyms and on small wording differences, and fuzzy matching adds a lot of complexity.
- **Offering both modes:** doubles the test-mode work for little gain.

## Consequences
- The test works for any kind of card content.
- Honesty is left to the user, which is acceptable for self-study.
- Quitting or refreshing mid-test loses that test's progress.
