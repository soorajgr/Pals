"use strict";

/*
 * core.js (Node only)
 * Loads the SAME browser scripts (utils, parser, extract, score) into an
 * isolated context, so the server, CLI and tests use exactly the code the
 * page runs. No logic is duplicated.
 */

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SHARED_FILES = ["utils.js", "parser.js", "extract.js", "score.js"];

function loadCore() {
  const context = vm.createContext({});

  for (const file of SHARED_FILES) {
    const source = fs.readFileSync(path.join(__dirname, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }

  return vm.runInContext(
    `({ parseMessages, parseLastRead, analyzeUnread, validISODate,
        MAX_CHARACTERS })`,
    context
  );
}

const core = loadCore();

/*
 * Validates input and runs the analysis. Returns { ok, ... }.
 * Never logs or stores the conversation.
 */
function analyze({ text, username, referenceDate, lastRead }) {
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, error: "Conversation text is required." };
  }

  if (text.length > core.MAX_CHARACTERS) {
    return {
      ok: false,
      error: `Conversation exceeds ${core.MAX_CHARACTERS} characters.`
    };
  }

  const date =
    referenceDate || new Date().toISOString().slice(0, 10);

  if (!core.validISODate(date)) {
    return { ok: false, error: "referenceDate must be a valid YYYY-MM-DD." };
  }

  const messages = core.parseMessages(text);
  const last = core.parseLastRead(lastRead ?? "", messages.length);

  if (!last.ok) {
    return { ok: false, error: last.error };
  }

  const items = core.analyzeUnread(
    messages,
    { username: String(username ?? "").slice(0, 80), referenceDate: date },
    last.value
  );

  return {
    ok: true,
    messageCount: messages.length,
    skipped: last.value,
    items
  };
}

module.exports = { core, analyze };
