"use strict";

/*
 * What Did I Miss?
 * No dependencies, network calls, analytics, or persistent storage.
 * Conversation content is always rendered using textContent.
 */

const $ = (id) => document.getElementById(id);

const MAX_CHARACTERS = 150_000;
const MAX_FILE_BYTES = 500_000;

let state = {
  messages: [],
  items: []
};

// Prevent an asynchronous file read from restoring data after Clear.
let importVersion = 0;

function node(tag, text, className) {
  const element = document.createElement(tag);

if (text !== undefined) {
    element.textContent = text;
  }

if (className) {
    element.className = className;
  }

return element;
}

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

return `${year}-${month}-${day}`;
}

function resetReferenceDate() {
  $("reference-date").value = localDate();

const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "browser local time";

$("date-help").textContent =
    `Defaults to your browser's date (${timezone}). ` +
    "ISO deadlines are compared by calendar date, not time of day.";
}

function validISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

const date = new Date(`${value}T00:00:00Z`);

return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanName(value) {
  return value.trim().replace(/^@/, "").toLocaleLowerCase();
}

function matchesMention(text, username) {
  const name = username.trim().replace(/^@/, "");

if (!name) {
    return false;
  }

const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])@${escapeRegex(name)}(?=$|[^\\p{L}\\p{N}_])`,
    "iu"
  );

return pattern.test(text);
}

/*
 * Accepted:
 * [2026-10-09 09:00] Maya: Message
 * Maya: Message
 * Unstructured message
 *
 * Indented lines are continuations.
 * Raw source text is retained separately from parsed content.
 */
function parseMessages(input) {
  const messages = [];
  const lines = input.split(/\r\n|\n|\r/);

for (const raw of lines) {
    if (!raw.trim()) {
      continue;
    }

if (/^\s/.test(raw) && messages.length > 0) {
      const previous = messages[messages.length - 1];
      previous.raw += `\n${raw}`;
      previous.text += `\n${raw.trim()}`;
      continue;
    }

const timestamped = raw.match(
      /^\[(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?)?)\]\s*([^:\[\]]{1,80}):\s*(.*)$/
    );

const named = raw.match(/^([^:\[\]]{1,80}):\s+(.*)$/);

let author = null;
    let timestamp = null;
    let text = raw;

if (timestamped) {
      timestamp = timestamped[1];
      author = timestamped[2].trim();
      text = timestamped[3];
    } else if (
      named &&
      !/^(decision|task|deadline|note|proposal|https?|ftp)$/i.test(
        named[1].trim()
      )
    ) {
      author = named[1].trim();
      text = named[2];
    }

messages.push({
      id: `message-${messages.length + 1}`,
      author,
      timestamp,
      text,
      raw
    });
  }

return messages;
}

/*
 * Only clearly isolated ISO calendar dates are normalized.
 * Relative, numeric, or timed expressions remain unresolved.
 */
function extractDeadline(text) {
  const expression =
    /\b(?:by|before|due(?:\s+(?:on|by))?|deadline(?:\s+is)?\s*:?)\s+([^.!?;\n]+)/i;

const match = text.match(expression);

if (!match) {
    return null;
  }

const phrase = match[1].trim();

const dateLike =
    /\d{4}-\d{2}-\d{2}|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b(?:today|tomorrow|tonight|eod|eow|noon|midnight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:am|pm)\b/i;

if (!dateLike.test(phrase)) {
    return null;
  }

const simpleISO = phrase.match(/^(\d{4}-\d{2}-\d{2})$/);
  const normalized =
    simpleISO && validISODate(simpleISO[1]) ? simpleISO[1] : null;

return {
    literal: match[0],
    normalized,
    needsClarification: normalized === null
  };
}

function getOwner(message) {
  const assigned = message.text.match(
    /(?:^|[^\p{L}\p{N}_])@([\p{L}\p{N}_][\p{L}\p{N}_.-]*),?\s+(?:please\b|can you\b|could you\b|must\b|need to\b)/iu
  );

if (assigned) {
    return assigned[1];
  }

if (/\bI\s+(?:will|shall)\b|\bI'll\b/i.test(message.text)) {
    return message.author || "Unassigned";
  }

return "Unassigned";
}

function scoreItem(item, message, options) {
  let score = 0;
  const reasons = [];

const baseScores = {
    Decision: 2,
    Task: 2,
    Proposal: 0,
    Mention: 0,
    Deadline: 1,
    Review: 0
  };

score += baseScores[item.category];

if (baseScores[item.category] > 0) {
    reasons.push(`${item.category} signal`);
  }

if (matchesMention(message.text, options.username)) {
    score += 3;
    reasons.push("Your exact @mention appears");
  }

if (
    item.owner !== "Unassigned" &&
    cleanName(item.owner) === cleanName(options.username) &&
    cleanName(options.username)
  ) {
    score += 2;
    reasons.push("Explicitly assigned to you");
  }

const urgent =
    /\b(?:urgent|asap|immediately|critical|blocker)\b/i.test(message.text);

const urgencyNegated =
    /\b(?:not urgent|not critical|no rush|no urgency|no longer urgent|not a blocker)\b/i.test(
      message.text
    );

if (urgent && !urgencyNegated && item.category !== "Review") {
    score += 3;
    reasons.push("Explicit urgency language");
  }

if (item.deadline?.normalized) {
    const days = Math.round(
      (
        Date.parse(`${item.deadline.normalized}T00:00:00Z`) -
        Date.parse(`${options.referenceDate}T00:00:00Z`)
      ) / 86_400_000
    );

if (days < 0) {
      score += 3;
      reasons.push("Deadline date has passed; completion is unknown");
    } else if (days === 0) {
      score += 3;
      reasons.push("Deadline date is today");
    } else if (days <= 2) {
      score += 2;
      reasons.push("Deadline date is within two calendar days");
    } else {
      reasons.push("Future ISO deadline");
    }
  }

if (item.deadline?.needsClarification) {
    reasons.push("Deadline requires clarification; not used for date ranking");
  }

if (reasons.length === 0) {
    reasons.push("Informational or uncertain signal");
  }

return {
    score,
    priority: score >= 5 ? "High" : score >= 2 ? "Medium" : "Low",
    reasons
  };
}

function analyzeMessages(messages, options) {
  const items = [];

for (const message of messages) {
    const text = message.text;

const sarcasm = /\/s(?:\s|$)|\[sarcasm\]/i.test(text);

const negativeDecision =
      /\b(?:not|never)\s+(?:yet\s+)?(?:decided|agreed|approved|confirmed|finalized)\b|\b(?:haven't|hasn't|didn't|don't|cannot|can't)\s+(?:yet\s+)?(?:decide|agree|approve|confirm)\b|\bno\s+(?:final\s+)?decision\b/i.test(
        text
      );

const proposal =
      /\b(?:should we|could we|maybe|perhaps|I propose|proposal|let's consider|we might)\b|\?/i.test(
        text
      );

const conditional = /\b(?:if|unless|provided that)\b/i.test(text);

const decisionSignal =
      /\b(?:decision\s*:|we decided|we agreed|it is decided|approved|confirmed|finalized)\b|\bagreed\s*[:,]/i.test(
        text
      );

const taskSignal =
      /\b(?:I will|I'll|I shall|please|can you|could you|must|need to|needs to|todo|action item)\b/i.test(
        text
      );

const cancelledOrCompleted =
      /\b(?:do not|don't|no longer need to|not required|already done|already completed|cancelled|canceled)\b/i.test(
        text
      );

const mentioned = matchesMention(text, options.username);
    const deadline = extractDeadline(text);

function add(category, confidence, explanation) {
      // Deduplicate a category within a message, not across messages.
      if (
        items.some(
          (item) =>
            item.sourceId === message.id && item.category === category
        )
      ) {
        return;
      }

const item = {
        id: `${message.id}-${category.toLowerCase()}`,
        sourceId: message.id,
        category,
        confidence,
        explanation,
        quote: message.text,
        owner: category === "Task" ? getOwner(message) : "Unassigned",
        deadline
      };

Object.assign(item, scoreItem(item, message, options));
      items.push(item);
    }

if (sarcasm) {
      add(
        "Review",
        "Low",
        "Explicit sarcasm marker detected; no decision or task is asserted."
      );

if (mentioned) {
        add("Mention", "High", "Your exact @mention appears in the message.");
      }

continue;
    }

if (
      decisionSignal &&
      !negativeDecision &&
      !proposal &&
      !conditional
    ) {
      add(
        "Decision",
        "High",
        "Explicit decision language without detected negation or qualification."
      );
    } else if (
      proposal ||
      (decisionSignal && conditional && !negativeDecision)
    ) {
      add(
        "Proposal",
        "Medium",
        "Question, suggestion, or conditional language; not a confirmed decision."
      );
    }

if (
      taskSignal &&
      !cancelledOrCompleted &&
      !negativeDecision &&
      !conditional
    ) {
      const owner = getOwner(message);

add(
        "Task",
        owner === "Unassigned" ? "Low" : "Medium",
        owner === "Unassigned"
          ? "Task-like language detected, but ownership is not explicit."
          : "Explicit commitment or request detected; acceptance/completion is unknown."
      );
    }

if (mentioned) {
      add("Mention", "High", "Your exact @mention appears in the message.");
    }

if (deadline && !cancelledOrCompleted) {
      add(
        "Deadline",
        deadline.needsClarification ? "Low" : "Medium",
        deadline.needsClarification
          ? "Deadline wording is preserved without guessing its date or timezone."
          : "Explicit ISO calendar date detected; time of day is unspecified."
      );
    }
  }

return items.sort((a, b) => b.score - a.score);
}

function deadlineLabel(deadline) {
  if (!deadline) {
    return "Not specified";
  }

return deadline.normalized
    ? `${deadline.literal} → ${deadline.normalized} (calendar date only)`
    : `${deadline.literal} — needs clarification`;
}

function createCard(item) {
  const card = node("article", undefined, `item ${item.priority.toLowerCase()}`);

card.append(
    node(
      "h3",
      `${item.category} · ${item.priority} priority · ${item.confidence} confidence`
    ),
    node("blockquote", item.quote),
    node("p", item.explanation),
    node("p", `Why highlighted: ${item.reasons.join("; ")}.`)
  );

if (item.category === "Task") {
    card.append(node("p", `Owner: ${item.owner}`));
  }

if (item.deadline) {
    card.append(node("p", `Deadline: ${deadlineLabel(item.deadline)}`));
  }

const link = node("a", `View source ${item.sourceId}`);
  link.href = `#${item.sourceId}`;

link.addEventListener("click", (event) => {
    event.preventDefault();

const source = document.getElementById(item.sourceId);

if (!source) {
      return;
    }

source.closest("details").open = true;
    source.scrollIntoView({ behavior: "smooth", block: "center" });
    source.focus({ preventScroll: true });
  });

card.append(link);

return card;
}

function renderItems() {
  const category = $("category").value;
  const priority = $("priority").value;

const filtered = state.items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (priority === "all" || item.priority === priority)
  );

$("items").replaceChildren();

if (filtered.length === 0) {
    $("items").append(
      node("p", "No matching items. No detected signal does not mean nothing matters.")
    );
    return;
  }

const fragment = document.createDocumentFragment();

for (const item of filtered) {
    fragment.append(createCard(item));
  }

$("items").append(fragment);
}

function renderResults() {
  $("results").hidden = false;
  $("stats").replaceChildren();

const decisions = state.items.filter(
    (item) => item.category === "Decision"
  ).length;

const tasks = state.items.filter(
    (item) => item.category === "Task"
  ).length;

const high = state.items.filter(
    (item) => item.priority === "High"
  ).length;

const stats = [
    ["Messages", state.messages.length],
    ["Extracted items", state.items.length],
    ["Tasks", tasks],
    ["High priority", high]
  ];

for (const [label, value] of stats) {
    const stat = node("div", undefined, "stat");
    stat.append(node("strong", String(value)), node("span", label));
    $("stats").append(stat);
  }

$("summary").textContent =
    `Detected ${decisions} explicit decision signal(s), ` +
    `${tasks} task signal(s), and ${high} high-priority item(s). ` +
    "One message can produce multiple items. Review the source before acting.";

$("transcript").replaceChildren();

const fragment = document.createDocumentFragment();

for (const message of state.messages) {
    const row = node("li");
    row.id = message.id;
    row.tabIndex = -1;

const metadata =
      `${message.id} · ${message.author || "Unknown author"}` +
      (message.timestamp ? ` · ${message.timestamp} (as supplied)` : "");

row.append(
      node("strong", metadata),
      node("pre", message.raw)
    );

fragment.append(row);
  }

$("transcript").append(fragment);
  renderItems();
}

function invalidateResults() {
  state = { messages: [], items: [] };

$("results").hidden = true;
  $("items").replaceChildren();
  $("transcript").replaceChildren();
  $("stats").replaceChildren();
  $("summary").textContent = "";
}

function analyzeInput() {
  const input = $("conversation").value;
  const referenceDate = $("reference-date").value;

if (!input.trim()) {
    invalidateResults();
    $("status").textContent = "Paste a conversation or import a local text file.";
    return;
  }

if (input.length > MAX_CHARACTERS) {
    invalidateResults();
    $("status").textContent =
      `Please keep the conversation under ${MAX_CHARACTERS.toLocaleString()} characters.`;
    return;
  }

if (!validISODate(referenceDate)) {
    invalidateResults();
    $("status").textContent = "Choose a valid analysis date.";
    return;
  }

const messages = parseMessages(input);

const items = analyzeMessages(messages, {
    username: $("username").value,
    referenceDate
  });

state = { messages, items };

renderResults();

$("status").textContent =
    `Analyzed ${messages.length} messages locally. Nothing was uploaded.`;
}

function clearEverything() {
  importVersion += 1;

$("conversation").value = "";
  $("username").value = "";
  $("file").value = "";
  $("category").value = "all";
  $("priority").value = "all";

resetReferenceDate();
  invalidateResults();

$("status").textContent = "Conversation and results cleared from app state.";
  $("conversation").focus();
}

async function importTextFile(event) {
  const version = ++importVersion;
  const file = event.target.files[0];

if (!file) {
    return;
  }

if (!/\.txt$/i.test(file.name)) {
    $("status").textContent = "Choose a .txt file.";
    event.target.value = "";
    return;
  }

if (file.size > MAX_FILE_BYTES) {
    $("status").textContent = "File too large. Choose a text file under 500 KB.";
    event.target.value = "";
    return;
  }

try {
    const text = await file.text();

if (version !== importVersion) {
      return;
    }

if (text.length > MAX_CHARACTERS) {
      $("status").textContent =
        `File exceeds the ${MAX_CHARACTERS.toLocaleString()} character limit.`;
      return;
    }

invalidateResults();
    $("conversation").value = text;
    $("status").textContent =
      "Local file loaded into memory. Select Analyze locally to continue.";
  } catch {
    if (version === importVersion) {
      $("status").textContent = "The local file could not be read.";
    }
  } finally {
    if (version === importVersion) {
      $("file").value = "";
    }
  }
}

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

/* ---------- UI events ---------- */

$("analyze").addEventListener("click", analyzeInput);
$("clear").addEventListener("click", clearEverything);
$("file").addEventListener("change", importTextFile);
$("category").addEventListener("change", renderItems);
$("priority").addEventListener("change", renderItems);
$("run-tests").addEventListener("click", runTests);

$("conversation").addEventListener("input", () => {
  importVersion += 1;
  invalidateResults();
  $("status").textContent = "Conversation changed. Analyze again for fresh results.";
});

for (const id of ["username", "reference-date"]) {
  $(id).addEventListener("input", () => {
    invalidateResults();
    $("status").textContent = "Settings changed. Analyze again for fresh results.";
  });
}

$("demo").addEventListener("click", () => {
  importVersion += 1;
  invalidateResults();

$("username").value = "Asha";
  $("reference-date").value = "2026-10-09";

$("conversation").value = [
    "[2026-10-09 09:00] Maya: Should we include the new dashboard?",
    "[2026-10-09 09:05] Maya: Decision: keep the launch scope small.",
    "[2026-10-09 09:10] Sam: I will prepare the release notes by 2026-10-12.",
    "[2026-10-09 09:12] Maya: @Asha please review the release notes by 2026-10-10. Urgent.",
    "[2026-10-09 09:15] Leo: Someone needs to check the onboarding copy.",
    "[2026-10-09 09:18] Sam: Please send feedback by tomorrow at 5 CST.",
    "[2026-10-09 09:20] Leo: Great, I will delete all backups. /s",
    "[2026-10-09 09:25] Maya: We have not decided to change pricing."
  ].join("\n");

$("status").textContent =
    "Fictional demo loaded. Analysis date set to 2026-10-09.";

analyzeInput();
});

resetReferenceDate();
