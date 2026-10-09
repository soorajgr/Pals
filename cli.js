#!/usr/bin/env node
"use strict";

/*
 * cli.js
 * Analyze a chat file from the terminal, fully offline.
 *
 * node cli.js chat.txt [--user Asha] [--date 2026-10-09] [--last-read 3] [--json]
 */

const fs = require("node:fs");
const { analyze } = require("./core");

function parseArgs(argv) {
  const args = { file: null, user: "", date: "", lastRead: "", json: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--user") args.user = argv[++i] ?? "";
    else if (arg === "--date") args.date = argv[++i] ?? "";
    else if (arg === "--last-read") args.lastRead = argv[++i] ?? "";
    else if (arg === "--json") args.json = true;
    else if (!args.file) args.file = arg;
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    console.error(
      "Usage: node cli.js <chat.txt> [--user NAME] [--date YYYY-MM-DD] [--last-read N] [--json]"
    );
    return 2;
  }

  let text;

  try {
    text = fs.readFileSync(args.file, "utf8");
  } catch {
    console.error(`Cannot read file: ${args.file}`);
    return 2;
  }

  const result = analyze({
    text,
    username: args.user,
    referenceDate: args.date,
    lastRead: args.lastRead
  });

  if (!result.ok) {
    console.error(`Error: ${result.error}`);
    return 1;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  console.log(
    `${result.messageCount - result.skipped} unread message(s), ` +
      `${result.items.length} item(s)\n`
  );

  for (const item of result.items) {
    console.log(`[${item.priority}] ${item.category} (${item.sourceId})`);
    console.log(`  "${item.quote.replace(/\s+/g, " ")}"`);
    console.log(`  why: ${item.reasons.join("; ")}`);

    if (item.category === "Task") console.log(`  owner: ${item.owner}`);
    if (item.deadline) {
      console.log(
        `  deadline: ${item.deadline.literal}` +
          (item.deadline.normalized ? ` -> ${item.deadline.normalized}` : " (needs clarification)")
      );
    }
  }

  return 0;
}

process.exitCode = main();
