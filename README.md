# What Did I Miss?

A local-first tool that reads a pasted chat and surfaces decisions, tasks,
mentions and deadlines, ranked by priority, with a "why" for every item.

## Privacy
- Runs entirely in the browser. No backend, no network requests, no storage.
- A Content-Security-Policy blocks all outgoing connections.
- Rule-based (no cloud AI), so every result can be explained.

## How to run
Open the folder in VS Code and click "Go Live", or open `index.html`.
Paste a chat (`[2026-10-09 09:00] Name: message`), enter your name, click
"Analyze locally". Use "Load fictional demo" to try it.

## Edge cases tested (built-in "Run 5 edge-case tests" button)
1. Proposal vs. decision and negation
2. Explicit sarcasm (/s)
3. Ambiguous deadlines (no invented dates)
4. Missing vs. explicit task ownership
5. Hostile markup, blank input, and mention false-matches

## Limitations
Indirect decisions, unmarked sarcasm and implicit owners can be missed.
Relative dates are preserved, not resolved.
Next step: an on-device model for context-aware extraction.