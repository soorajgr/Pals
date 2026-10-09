# prompt.md: AI-Assisted Development Log

**Project:** What Did I Miss? (ProtocolX challenge: "The Unread Problem")
**Event date:** 9 October 2026
**Repo:** https://github.com/soorajgr/What_Did_I_Miss
**AI tools used:** Claude (planning, code review, debugging help); 
> Honesty note: this log lists only interactions that actually happened.
> Nothing here was invented after the fact. No API keys, passwords or other
> secrets are used or stored in this project.

---

## 1. Project Overview

- **Problem:** People return to long, unread group chats and cannot quickly
  tell what matters: decisions, tasks assigned to them, mentions, deadlines.
- **Solution:** A local-first web micro-app. The user pastes a conversation
  (or imports a local .txt file), enters their name, and the app extracts and
  ranks decisions, proposals, tasks, mentions and deadlines. Every item shows
  the original quote, a plain-language explanation, a "why highlighted" list,
  and a link to the exact source message.
- **Key features:**
  - Rule-based extraction of Decision, Proposal, Task, Mention, Deadline and
    Review (sarcasm) items
  - Transparent priority scoring (High / Medium / Low) with reasons
  - Confidence labels that describe rule strength, not probabilities
  - Task owner detection (explicit only; otherwise "Unassigned")
  - Deadline handling that preserves the original wording and never guesses
    relative dates or time zones
  - Filters by category and priority
  - Source message list with links from each item back to its message
  - Fictional demo data, a "Clear everything" button, local .txt import
  - Built-in "Run 5 edge-case tests" panel
  - Privacy: no backend, no network requests, no storage

## 2. Tech Stack & Architecture

- **Stack:** Plain HTML, CSS and JavaScript. No frameworks, no dependencies,
  no build step. Files: `index.html`, `app.js`, `styles.css`.
- **Pipeline:**
  Local input -> message parser -> rule-based extraction -> priority scoring
  -> results linked to source messages.
- **Why rules instead of a cloud AI model:** rules run offline, are fast, keep
  data on the device, and can explain every result. The app does not use a
  language model.
- **Local-first controls:**
  - A Content-Security-Policy meta tag with `connect-src 'none'` and
    `default-src 'none'` so the browser blocks outgoing connections
  - Conversation text is rendered with `textContent` only, never as HTML
  - No localStorage, cookies, analytics or exports; data lives in page memory
  - Input size limits (150,000 characters; 500 KB file import)
- **Supported input format:** `[YYYY-MM-DD HH:mm] Name: message` or
  `Name: message`. Indented lines continue the previous message.

## 3. AI Code Generation

### Entry 1: Master prompt (process setup)
- **Prompt:** The "MASTER PROMPT: VIBE CODING HACKATHON" text, sent as-is. It
  asked the AI to act as coding partner, architect and debugging assistant,
  to produce this `prompt.md` before any code, and to keep it updated without
  inventing prompts, results or test outcomes.
- **Tool/model:** Claude
- **Purpose:** Set up the working process and the logging requirement.
- **Files affected:** none
- **Outcome/verification:** Process agreed. Claude asked for the challenge
  statement before planning.

### Entry 2: Challenge statement and planning
- **Prompt:** The challenge text ("The Unread Problem - What Did I Miss?"),
  sent to Claude so it could plan.
- **Tool/model:** Claude
- **Purpose:** Choose an approach, propose an architecture, define an MVP and
  propose 5 edge cases before building.
- **Files affected:** none (plan only)
- **Outcome/verification:** Claude proposed a rule-based, fully local approach
  (parser, detectors, scorer, summarizer, UI), a CSP to block network access,
  and 5 candidate edge cases. This was a plan only, not code.

### Entry 3: Build prompt (the only prompt used to generate the app)
- **Prompt:** (pasted exactly as sent)

  > Challenge:
  >
  > The Unread Problem - "What Did I Miss?"
  >
  > The challenge is to build a simple Al micro-app that helps users quickly
  > understand and prioritize important information from overwhelming chat
  > conversations.
  >
  > The solution can focus on:
  >
  > - Summarizing long and unread conversations
  > - Identifying important messages, decisions, and action items
  > - Prioritizing information based on urgency and relevance
  > - Highlighting mentions, deadlines, and tasks the user may have missed
  > - Using local-first processing, ensuring conversations, data, and
  >   summaries neve[r leave the device]
  >
  > Build a local-first tool that identifes important messages, decisions, and
  > action items. Explain why. Keep data local. Propose architecture first,
  > then build and test 5 edge cases.
  >
  > The current implementation deliberately uses local rule-based analysis,
  > rather than a cloud AI model. This makes it simple to run privately, but
  > it has limitations:
  >
  > It may miss decisions expressed indirectly or in sarcasm.
  >
  > It does not fully resolve relative dates, time zones, or ambiguous
  > deadlines.
  >
  > It cannot reliably determine who owns a task when the conversation leaves
  > ownership implicit.
  >
  > It does not yet connect to WhatsApp, Slack, Discord, or other chat
  > platforms.
  >
  > Its local-only design applies to this standalone app: it contains no
  > backend or analytics code, and it does not persist conversation text by
  > default.
  >
  > The next improvement I would prioritize is context-aware extraction with
  > confidence levels: distinguish confirmed decisions from proposals,
  > identify task owners and deadlines, and preserve links to the exact source
  > messages. A compact language model running entirely on-device could
  > improve interpretation without requiring conversation uploads.

  (The word "neve" is cut off in the original text I pasted; it is kept as
  sent.)
- **Tool/model:** [FILL IN: the AI tool you sent this prompt to]
- **Purpose:** Generate the complete app, including parser, extraction,
  scoring, UI and the five built-in edge-case tests.
- **Files affected:** `index.html`, `app.js`, `styles.css`
- **Outcome/verification:** App generated. It was later checked by running
  its built-in tests and demo (see sections 4 and 6).

## 4. Debugging

### Bug: "Decision:" messages were never detected
- **Prompt:** I uploaded `index.html`, `app.js` and `styles.css` to Claude and
  said "this is my app", which asked for a review.
- **Tool/model:** Claude
- **Purpose:** Review the finished app and run its tests.
- **Files affected:** `app.js` (the `decisionSignal` regular expression)
- **Problem found:** Claude ran the app's own tests in a simulated browser
  (jsdom, not a real browser). Test 1 failed ("Explicit decision was
  missed"), giving 4/5. The demo reported 0 decisions even though it contains
  "Decision: keep the launch scope small."
- **Cause:** The pattern ended with a word-boundary check (`\b`) right after
  `decision:`. A word boundary does not exist between ":" and a space, so the
  pattern could never match "Decision: ...".
- **Fix:** Moved the `decision\s*:` alternative outside the group that ends in
  `\b`:
  - Before: `\b(?:decision\s*:|we decided|...|finalized)\b|\bagreed\s*[:,]`
  - After: `\bdecision\s*:|\b(?:we decided|...|finalized)\b|\bagreed\s*[:,]`
- **Outcome/verification:** In Claude's simulated run the result went from 4/5
  to 5/5, and the demo then showed 1 decision. I then ran the built-in tests
  in my own browser and all 5 passed. [FILL IN: browser name]

## 5. AI Features & Design

- **No AI model runs inside the app.** Analysis is deterministic rules, chosen
  so that data stays local and every result is explainable.
- **Design decisions (from the build prompt and the planning discussion):**
  - Explain why: each card shows the quote, an explanation and a "Why
    highlighted" list built from the scoring reasons
  - Uncertainty is shown, not hidden: confidence labels, "Unassigned" owners,
    "needs clarification" deadlines, and a Review category for sarcasm
  - Provenance: every item links back to the exact source message
  - Accessible, simple UI: labelled inputs, status messages with `aria-live`,
    visible focus outlines, responsive layout
- **Future AI feature (not built):** a compact on-device language model for
  context-aware extraction, keeping offline processing and source quotes.

## 6. Testing & Improvements

**Built-in edge-case tests** (button: "Run 5 edge-case tests"):

1. Proposal vs. decision and negation
2. Explicit sarcasm (`/s`)
3. Ambiguous deadline (no invented date or time zone)
4. Missing vs. explicit task ownership
5. Hostile markup, blank input and unsafe mention matching

**Results:**
- Before the regex fix: 4/5 passed (test 1 failed).
- After the regex fix: 5/5 passed, confirmed in my own browser. [FILL IN:
  browser name and time]
- Fictional demo: confirmed it now detects the decision. [Tick only if you
  checked this yourself.]

**Not tested:**
- Other browsers, mobile browsers, very large conversations, real exported
  chats from WhatsApp, Slack or Discord, and screen readers.
- The tests are targeted checks, not a full accuracy or security audit.

**Known limitations:**
- Indirect decisions, unmarked sarcasm and implicit task owners can be missed.
- Relative dates ("tomorrow"), numeric dates ("03/04") and time zones are
  preserved but not resolved.
- An old deadline does not prove a task is still open.
- Opening `index.html` directly from disk may be affected by the strict CSP in
  some browsers; running it with a local server (VS Code "Go Live") avoids this.

## 7. Final Summary

- **AI tools used:** Claude (planning, review, debugging help);
  [FILL IN: the tool used for the build prompt]
- **Major contributions from AI:**
  - Planning and architecture choice (rule-based, local-first)
  - Generated app code from one build prompt
  - Code review that found and fixed the decision-detection bug
- **My own contributions:** chose the project direction, wrote the build
  prompt, ran the tests in my browser, applied the fix, set up the GitHub repo,
  and committed and pushed the work.
- **Completed features:** parser, rule-based extraction, priority scoring with
  reasons, source links, filters, local .txt import, clear button, local-first
  CSP, 5 built-in edge-case tests, README.
- **Next improvement:** on-device language model for context-aware extraction
  with confidence levels, plus importers for chat exports.
