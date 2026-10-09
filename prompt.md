# prompt.md: AI-Assisted Development Log

**Project:** What Did I Miss? (ProtocolX challenge: "The Unread Problem")
**Event date:** 9 October 2026
**Repo:** https://github.com/soorajgr/What_Did_I_Miss
**AI tools used:** Claude (planning, code review, debugging, refactoring help); [FILL IN: tool used for the build prompt, e.g. Claude / ChatGPT / Gemini]

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
  and a link to the exact source message. The user can also enter the number
  of the last message they read, and only the unread part is analyzed.
- **Key features:**
  - Rule-based extraction of Decision, Proposal, Task, Mention, Deadline and
    Review (sarcasm) items
  - Transparent priority scoring (High / Medium / Low) with reasons
  - Confidence labels that describe rule strength, not probabilities
  - Task owner detection (explicit only; otherwise "Unassigned")
  - Deadline handling that preserves the original wording and never guesses
    relative dates or time zones
  - "Last message you read" field: skips already-read messages and greys them
    out in the source list
  - Filters by category and priority
  - Source message list with links from each item back to its message
  - Fictional demo data, a "Clear everything" button, local .txt import
  - Built-in edge-case test panel (5 core tests + 1 for the last-read feature)
  - Privacy: no backend, no network requests, no storage

## 2. Tech Stack & Architecture

- **Stack:** Plain HTML, CSS and JavaScript. No frameworks, no dependencies,
  no build step.
- **Files:** `index.html`, `styles.css`, and six plain scripts loaded in this
  order: `utils.js` (helpers, limits), `parser.js` (message parsing, last-read
  validation), `extract.js` (rule-based extraction), `score.js` (priority
  scoring), `tests.js` (edge-case tests), `ui.js` (rendering, state, events).
  (The first version was a single `app.js`; see Entry 5.)
- **Pipeline:**
  Local input -> message parser -> (optional) skip already-read messages ->
  rule-based extraction -> transparent priority scoring -> results linked to
  source messages.
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

### Entry 3: Build prompt (the prompt used to generate the first version of the app)
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

  (The word "neve" is cut off in the text I pasted; it is kept as sent.)
- **Tool/model:** [FILL IN: the AI tool you sent this prompt to]
- **Purpose:** Generate the first version of the app, including parser,
  extraction, scoring, UI and the five built-in edge-case tests.
- **Files affected:** `index.html`, `app.js`, `styles.css` (first version)
- **Outcome/verification:** App generated. It was later checked by running
  its built-in tests and demo (see sections 4 and 6).

### Entry 4: Improvement round after the Round 1 result
- **Prompt:** After seeing my Round 1 score breakdown (Backend & Architecture
  60, Code Standards 75, Innovation 80, UI/UX 80, Security 85), I asked Claude
  how to improve. Claude proposed two low-risk changes: split the code into
  separate files, and add an "unread since here" selector. I replied "go".
- **Tool/model:** Claude
- **Purpose:** Raise the architecture and code-quality scores and add a
  feature that matches the "What Did I Miss?" idea.
- **Files affected:** `app.js` (removed) split into `utils.js`, `parser.js`,
  `extract.js`, `score.js`, `tests.js`, `ui.js`; plus `index.html`,
  `styles.css`, `README.md`
- **Outcome/verification:** In Claude's simulated browser (jsdom) all 6 test
  groups passed and the last-read feature worked through the real buttons
  (valid numbers, 0, empty, negative, too large, all messages read, Clear).
  [FILL IN: "Confirmed in my own browser" with browser name, only if true]
  

## 4. Debugging

### Entry 5: Code split (behavior-preserving)
- **Change:** `app.js` was split into six plain script files. The split was
  checked on its own first (5/5 tests, same demo output) before the new
  feature was added, so any later failure could be traced to the feature and
  not to the split.
- **Tool/model:** Claude
- **Files affected:** `utils.js`, `parser.js`, `extract.js`, `score.js`,
  `tests.js`, `ui.js`, `index.html` (script tags)
- **Outcome/verification:** Same results before and after the split in the
  simulated browser.

### Bug: "Decision:" messages were never detected
- **Prompt:** I uploaded `index.html`, `app.js` and `styles.css` to Claude and
  said "this is my app", which asked for a review.
- **Tool/model:** Claude
- **Purpose:** Review the finished app and run its tests.
- **Files affected:** `app.js` (later `extract.js`): the `decisionSignal`
  regular expression
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

Entry 6 : WhatsApp export support
Prompt: After Claude gave a harsh critique of my score, one weakness was that real chats don't match my input format. I replied "yes" to Claude's offer to build a WhatsApp export parser.
Tool/model: Claude
Purpose: Let users paste or import a real WhatsApp text export (Android and iPhone) instead of only my custom format.
Files affected: parser.js, extract.js, ui.js, tests.js, index.html, README.md, whatsapp-sample.txt
Outcome/verification: In Claude's simulated browser (jsdom) all 7 test groups passed. Claude also ran a messy sample (system lines, multi-line messages, media lines, emoji, an Android and an iPhone variant, 24-hour time). Removing the WhatsApp detection made test 7 fail, so the test does check the feature. [Confirmed in my own browser: YES/NO. Tested with a real export from my own chat: YES/NO]

## 5. AI Features & Design

- **No AI model runs inside the app.** Analysis is deterministic rules, chosen
  so that data stays local and every result is explainable.
- **Design decisions (from the build prompt and the planning discussion):**
  - Explain why: each card shows the quote, an explanation and a "Why
    highlighted" list built from the scoring reasons
  - Uncertainty is shown, not hidden: confidence labels, "Unassigned" owners,
    "needs clarification" deadlines, and a Review category for sarcasm
  - Provenance: every item links back to the exact source message
  - Unread focus: the last-read field analyzes only what came after, while
    message numbers stay stable so source links still match
  - Accessible, simple UI: labelled inputs, status messages with `aria-live`,
    visible focus outlines, responsive layout
- **Future AI feature (not built):** a compact on-device language model for
  context-aware extraction, keeping offline processing and source quotes.

## 6. Testing & Improvements

**Built-in edge-case tests** (button: "Run edge-case tests (5 core + 1)"):

1. Proposal vs. decision and negation
2. Explicit sarcasm (`/s`)
3. Ambiguous deadline (no invented date or time zone)
4. Missing vs. explicit task ownership
5. Hostile markup, blank input and unsafe mention matching
6. Last-read marker: only messages after the last-read point are analyzed;
   empty means 0; negative, non-numeric and too-large values are rejected;
   nothing remains when every message is read
7. WhatsApp export formats. Now 5 core edge cases + 2 tests for new features. [Result in my browser: __/7 on ____]
Known limits: WhatsApp mentions written as plain names (no @) are not detected; day/month order in dates is not interpreted; Slack and Discord are not supported.

**Results:**
- Before the regex fix: 4/5 passed (test 1 failed).
- After the regex fix: 5/5 passed, confirmed in my own browser. [FILL IN:
  browser name and time]
- After the code split and last-read feature: 6/6 passed in the simulated
  browser. [FILL IN: "6/6 passed in my browser: ____ on ____" only if true]
- Fictional demo: confirmed it detects the decision. [Keep only if you
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
- Message numbers for the last-read field are only visible after a first
  analysis.
- Opening `index.html` directly from disk may be affected by the strict CSP in
  some browsers; running it with a local server (VS Code "Go Live") avoids this.

## 7. Final Summary

- **AI tools used:** Claude (planning, review, debugging, refactoring help);
  [FILL IN: the tool used for the build prompt]
- **Major contributions from AI:**
  - Planning and architecture choice (rule-based, local-first)
  - Generated the first version of the app code from one build prompt
  - Code review that found and fixed the decision-detection bug
  - Behavior-preserving split into modules and the last-read feature
- **My own contributions:** chose the project direction, wrote the build
  prompt, ran the tests in my browser, applied the fixes, set up the GitHub
  repo, and committed and pushed the work.
- **Completed features:** parser, rule-based extraction, priority scoring with
  reasons, source links, filters, local .txt import, clear button, local-first
  CSP, last-read marker, 6 built-in edge-case tests, README with architecture
  diagram.
- **Next improvement:** decision reversal ("Monday" then "actually Tuesday"
  shows only the latest), resolving simple relative dates, and an on-device
  language model for context-aware extraction.
