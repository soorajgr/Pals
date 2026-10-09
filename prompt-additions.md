<!-- Paste these into prompt.md. Fill the [BRACKETS] only with what is true. -->

### Entry 4 (add to section 3): Improvement round before resubmission
- **Prompt:** After seeing my Round 1 score breakdown (Backend & Architecture
  60, Code Standards 75, Innovation 80, UI/UX 80), I asked Claude how to
  improve. Claude proposed two low-risk changes (split the code into files;
  add an "unread since here" selector). I replied: "go".
- **Tool/model:** Claude
- **Purpose:** Raise the architecture and code-quality scores and add a
  feature that matches the "What Did I Miss?" idea.
- **Files affected:** app.js (removed) split into utils.js, parser.js,
  extract.js, score.js, tests.js, ui.js; index.html, styles.css, README.md
- **Outcome/verification:** In Claude's simulated browser (jsdom) all 6 test
  groups passed and the last-read feature worked through the real buttons
  (valid numbers, 0, empty, negative, too large, all read, Clear).
  [Confirmed in my own browser: YES/NO, browser name]

### Entry 5 (add to section 4): Code split
- **Change:** Behavior-preserving split of app.js into six plain script files.
  The split was verified first on its own (5/5 tests, same demo output) before
  the new feature was added.
- **Included fix:** the earlier decisionSignal regex fix is part of extract.js.

### Add to section 6
- Test 6 added: last-read marker. Total now 5 core edge cases + 1 for the new
  feature. [Browser result: 6/6 passed in ____ on ____]
- Not tested: real chat exports, very large inputs, screen readers.
