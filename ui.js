"use strict";

/*
 * ui.js
 * Rendering, state and event wiring. Loaded last.
 */

let state = {
  messages: [],
  items: [],
  skipped: 0
};

// Prevent an asynchronous file read from restoring data after Clear.
let importVersion = 0;

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
    ["Unread messages", state.messages.length - state.skipped],
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
    "One message can produce multiple items. Review the source before acting." +
    (state.skipped
      ? ` ${state.skipped} already-read message(s) were skipped.`
      : "");

$("transcript").replaceChildren();

const fragment = document.createDocumentFragment();

for (const [index, message] of state.messages.entries()) {
    const row = node("li");
    row.id = message.id;
    row.tabIndex = -1;

    if (index < state.skipped) {
      row.className = "read";
    }

const metadata =
      `${message.id} · ${message.system ? "System message" : message.author || "Unknown author"}` +
      (message.timestamp ? ` · ${message.timestamp} (as supplied)` : "") +
      (index < state.skipped ? " · already read" : "");

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
  state = { messages: [], items: [], skipped: 0 };

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
      `Please keep the conversation under ${MAX_CHARACTERS.toLocaleString()} characters. Paste only the recent part of the chat.`;
    return;
  }

if (!validISODate(referenceDate)) {
    invalidateResults();
    $("status").textContent = "Choose a valid analysis date.";
    return;
  }

const messages = parseMessages(input);

const lastRead = parseLastRead($("last-read").value, messages.length);

if (!lastRead.ok) {
    invalidateResults();
    $("status").textContent = lastRead.error;
    return;
  }

const items = analyzeUnread(
    messages,
    { username: $("username").value, referenceDate },
    lastRead.value
  );

state = { messages, items, skipped: lastRead.value };

renderResults();

$("status").textContent =
    `Analyzed ${messages.length - lastRead.value} unread message(s) locally ` +
    `(${lastRead.value} skipped as already read). Nothing was uploaded.`;
}

function clearEverything() {
  importVersion += 1;

$("conversation").value = "";
  $("username").value = "";
  $("last-read").value = "";
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
        `File exceeds the ${MAX_CHARACTERS.toLocaleString()} character limit. Use only the recent part of the chat.`;
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

for (const id of ["username", "reference-date", "last-read"]) {
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
  $("last-read").value = "";

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
