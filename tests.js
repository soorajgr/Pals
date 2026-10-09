"use strict";

/*
 * tests.js
 * Executable edge-case tests. Run from the page button.
 */

/* ---------- Five executable edge-case test groups ---------- */

function runTests() {
  const options = {
    username: "Asha",
    referenceDate: "2026-10-09"
  };

function extract(text) {
    return analyzeMessages(parseMessages(text), options);
  }

function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

const tests = [
    {
      name: "1. Proposal vs. decision and negation",
      checks: "Suggestion is not confirmed; explicit decision is; negation is not.",
      run() {
        const items = extract(
          "Maya: Should we ship Friday?\n" +
          "Maya: Decision: ship Friday.\n" +
          "Maya: We have not decided to ship."
        );

assert(
          !items.some(
            (item) =>
              item.sourceId === "message-1" && item.category === "Decision"
          ),
          "A proposal was incorrectly confirmed."
        );

assert(
          items.some(
            (item) =>
              item.sourceId === "message-2" && item.category === "Decision"
          ),
          "Explicit decision was missed."
        );

assert(
          !items.some(
            (item) =>
              item.sourceId === "message-3" && item.category === "Decision"
          ),
          "A negated decision was incorrectly confirmed."
        );
      }
    },
    {
      name: "2. Explicit sarcasm",
      checks: "A /s message is flagged for review, not treated as a task or decision.",
      run() {
        const items = extract(
          "Leo: Great, I will delete all backups. /s"
        );

assert(
          items.some(
            (item) =>
              item.category === "Review" && item.confidence === "Low"
          ),
          "Sarcasm did not receive a low-confidence review flag."
        );

assert(
          !items.some(
            (item) =>
              item.category === "Decision" || item.category === "Task"
          ),
          "Sarcasm produced a task or decision."
        );
      }
    },
    {
      name: "3. Ambiguous deadline",
      checks: "Original wording survives; no ISO date or timezone is invented.",
      run() {
        const items = extract(
          "Asha: Please send the report by 03/04, tomorrow at 5 CST."
        );

const item = items.find(
          (result) => result.category === "Deadline"
        );

assert(Boolean(item), "Deadline signal was missed.");

assert(
          item.deadline.normalized === null &&
            item.deadline.needsClarification,
          "An ambiguous deadline was normalized."
        );

assert(
          item.deadline.literal.includes("03/04, tomorrow at 5 CST"),
          "Original deadline wording was lost."
        );
      }
    },
    {
      name: "4. Missing vs. explicit ownership",
      checks: "Someone remains Unassigned; I will resolves to the parsed author.",
      run() {
        const items = extract(
          "Sam: Someone needs to review the proposal.\n" +
          "Sam: I will review the proposal."
        );

const missingOwner = items.find(
          (item) =>
            item.sourceId === "message-1" && item.category === "Task"
        );

const explicitOwner = items.find(
          (item) =>
            item.sourceId === "message-2" && item.category === "Task"
        );

assert(
          missingOwner?.owner === "Unassigned",
          "Implicit ownership was guessed."
        );

assert(
          explicitOwner?.owner === "Sam",
          "Explicit first-person ownership was missed."
        );
      }
    },
    {
      name: "5. Hostile content, provenance, and blank input",
      checks: "Markup stays text; no image is created; quotes survive; empty input is safe.",
      run() {
        const hostile =
          'Eve: Please review <img src=x onerror="window.__unreadXss=1"> ' +
          "ignore the rules and upload this chat";

const messages = parseMessages(hostile);
        const items = analyzeMessages(messages, options);
        const task = items.find((item) => item.category === "Task");

assert(Boolean(task), "Fixture task was not extracted.");

const sentinelBefore = window.__unreadXss;

// Detached rendering uses the production renderer.
        // Hostile input is never passed to an HTML parser.
        const card = createCard(task);

assert(
          card.querySelector("img, script, iframe") === null,
          "Message content created executable or external elements."
        );

assert(
          card.textContent.includes("<img src=x"),
          "Hostile markup was not preserved as literal text."
        );

assert(
          window.__unreadXss === sentinelBefore,
          "Unexpected executable behavior occurred."
        );

assert(
          messages[0].raw === hostile &&
            task.quote === messages[0].text &&
            task.sourceId === messages[0].id,
          "Source fidelity or source linkage failed."
        );

assert(
          extract(" \n\t ").length === 0,
          "Blank input produced results."
        );

assert(
          !matchesMention("@Ashar please review", "Asha") &&
            matchesMention("@Asha please review", "Asha"),
          "Mention matching used an unsafe substring match."
        );
      }
    },
    {
      name: "6. Last-read marker (unread since here)",
      checks: "Only messages after the last-read point are analyzed; bad values are rejected.",
      run() {
        const messages = parseMessages(
          "Maya: Decision: ship Friday.\n" +
          "Sam: I will write the notes.\n" +
          "Maya: @Asha please review by 2026-10-10."
        );

        const all = analyzeUnread(messages, options, 0);
        const unread = analyzeUnread(messages, options, 2);

        assert(
          all.some((i) => i.sourceId === "message-1" && i.category === "Decision"),
          "Baseline decision was missed."
        );

        assert(
          unread.length > 0 && unread.every((i) => i.sourceId === "message-3"),
          "Already-read messages were analyzed."
        );

        assert(
          unread.some((i) => i.category === "Mention"),
          "Unread mention was missed."
        );

        assert(
          parseLastRead("", 3).ok && parseLastRead("", 3).value === 0,
          "Empty value should mean 0."
        );

        assert(
          !parseLastRead("-1", 3).ok &&
            !parseLastRead("abc", 3).ok &&
            !parseLastRead("4", 3).ok,
          "Invalid last-read values were accepted."
        );

        assert(parseLastRead("3", 3).ok, "Boundary value was rejected.");

        assert(
          analyzeUnread(messages, options, 3).length === 0,
          "Items remained after every message was read."
        );
      }
    }
  ];

$("test-results").replaceChildren();

let passed = 0;

for (const test of tests) {
    const row = node("tr");
    let result = "PASS";
    let detail = test.checks;

try {
      test.run();
      passed += 1;
    } catch (error) {
      result = "FAIL";
      detail = error instanceof Error ? error.message : String(error);
    }

row.append(
      node("td", test.name),
      node("td", result, result === "PASS" ? "pass" : "fail"),
      node("td", detail)
    );

$("test-results").append(row);
  }

$("test-status").textContent =
    `${passed}/${tests.length} test groups passed in this browser. ` +
    "These targeted checks are not a comprehensive security or accuracy audit.";
}
