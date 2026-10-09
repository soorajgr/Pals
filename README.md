# What Did I Miss?

A local-first tool that reads a pasted chat and surfaces decisions, tasks,
mentions and deadlines, ranked by priority, with a "why" for every item.
You can also say which message you last read, and only the **unread** part is
analyzed.

## Privacy
- Runs entirely in the browser. No backend, no network requests, no storage.
- A Content-Security-Policy blocks all outgoing connections.
- Rule-based (no cloud AI), so every result can be explained.

## Architecture

```
 pasted text / .txt file            "last message I read" (optional)
          |                                     |
          v                                     v
   [parser.js]  parseMessages          [parser.js]  parseLastRead
   (plain or WhatsApp export)
          |                                     |
          +------------------+------------------+
                             v
                   [extract.js]  analyzeUnread -> analyzeMessages
                   (decisions, proposals, tasks, owners,
                    mentions, deadlines, sarcasm)
                             |
                             v
                   [score.js]  scoreItem
                   (points + a reason for every point)
                             |
                             v
                   [ui.js]  cards, filters, source links
                   [tests.js]  edge-case tests (run from the page)
                   [utils.js]  shared helpers, limits
```

Files are plain scripts loaded in this order: utils, parser, extract, score,
tests, ui. No build step and no frameworks.

## How to run
Open the folder in VS Code and click "Go Live" (or open `index.html`).
Paste a chat or import a `.txt` file, enter your name, click
"Analyze locally". Use "Load fictional demo" to try it. To skip what you
already read, type that message's number in "Last message you read".

## Supported chat formats
- `[2026-10-09 09:00] Name: message` or `Name: message`
- **WhatsApp text export** (Export chat -> Without media):
  Android `09/10/26, 10:30 am - Name: message` and iPhone
  `[09/10/2026, 10:30:15 AM] Name: message`. Multi-line messages are joined,
  system lines are skipped, and timestamps are shown exactly as exported
  (day/month order is ambiguous, so dates are never guessed).
- Not supported: Slack and Discord exports. Very long exports: use only the
  recent part (limit 150,000 characters).

## Edge cases tested (button: "Run edge-case tests")
1. Proposal vs. decision and negation
2. Explicit sarcasm (/s)
3. Ambiguous deadlines (no invented dates)
4. Missing vs. explicit task ownership
5. Hostile markup, blank input, and mention false-matches
6. Last-read marker (only unread messages analyzed; bad values rejected)
7. WhatsApp export formats (Android and iPhone lines, multi-line messages,
   system lines, original format unchanged)

## Limitations
Indirect decisions, unmarked sarcasm and implicit owners can be missed.
Relative dates are preserved, not resolved. Message numbers are only visible
after a first analysis. WhatsApp mentions written without `@` (just a name)
are not detected. Next step: an on-device model for context-aware
extraction.
