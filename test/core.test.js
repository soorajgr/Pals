"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { analyze } = require("../core");

const base = { username: "Asha", referenceDate: "2026-10-09" };

test("proposal, decision and negation are told apart", () => {
  const r = analyze({
    ...base,
    text:
      "Maya: Should we ship Friday?\nMaya: Decision: ship Friday.\nMaya: We have not decided to ship."
  });
  const has = (id, cat) =>
    r.items.some((i) => i.sourceId === id && i.category === cat);
  assert.ok(!has("message-1", "Decision"));
  assert.ok(has("message-2", "Decision"));
  assert.ok(!has("message-3", "Decision"));
});

test("explicit sarcasm is a low-confidence review, not a task", () => {
  const r = analyze({ ...base, text: "Leo: Great, I will delete all backups. /s" });
  assert.ok(r.items.some((i) => i.category === "Review" && i.confidence === "Low"));
  assert.ok(!r.items.some((i) => i.category === "Task" || i.category === "Decision"));
});

test("ambiguous deadlines are never normalized", () => {
  const r = analyze({
    ...base,
    text: "Asha: Please send the report by 03/04, tomorrow at 5 CST."
  });
  const d = r.items.find((i) => i.category === "Deadline");
  assert.equal(d.deadline.normalized, null);
  assert.ok(d.deadline.needsClarification);
});

test("ISO date followed by plain words normalizes; with a time it does not", () => {
  const plain = analyze({ ...base, text: "Leo: I will send it by 2026-10-12, will share in the group." });
  assert.equal(plain.items.find((i) => i.category === "Deadline").deadline.normalized, "2026-10-12");

  for (const text of [
    "Leo: I will send it by 2026-10-12, 5pm.",
    "Leo: I will send it by 2026-10-12, at 5.",
    "Leo: I will send it by 2026-10-12 5pm."
  ]) {
    const r = analyze({ ...base, text });
    assert.equal(r.items.find((i) => i.category === "Deadline").deadline.normalized, null, text);
  }
});

test("missing owner stays Unassigned; 'I will' resolves to the author", () => {
  const r = analyze({
    ...base,
    text: "Sam: Someone needs to review the proposal.\nSam: I will review the proposal."
  });
  const owner = (id) => r.items.find((i) => i.sourceId === id && i.category === "Task").owner;
  assert.equal(owner("message-1"), "Unassigned");
  assert.equal(owner("message-2"), "Sam");
});

test("mention matching is exact, not a substring", () => {
  const r = analyze({ ...base, text: "Maya: @Ashar please review" });
  assert.ok(!r.items.some((i) => i.category === "Mention"));
});

test("last-read skips earlier messages and validates input", () => {
  const text =
    "Maya: Decision: ship Friday.\nSam: I will write the notes.\nMaya: @Asha please review by 2026-10-10.";
  const unread = analyze({ ...base, text, lastRead: "2" });
  assert.ok(unread.items.length > 0);
  assert.ok(unread.items.every((i) => i.sourceId === "message-3"));
  assert.equal(analyze({ ...base, text, lastRead: "3" }).items.length, 0);
  for (const bad of ["-1", "abc", "4"]) {
    assert.equal(analyze({ ...base, text, lastRead: bad }).ok, false, bad);
  }
});

test("WhatsApp sample parses, skips system lines and joins continuations", () => {
  const text = fs.readFileSync(path.join(__dirname, "..", "whatsapp-sample.txt"), "utf8");
  const r = analyze({ text, username: "Sooraj", referenceDate: "2026-10-09" });
  assert.ok(r.items.some((i) => i.category === "Decision" && i.sourceId === "message-5"));
  assert.ok(r.items.some((i) => i.category === "Mention"));
  assert.ok(!r.items.some((i) => i.sourceId === "message-1"));
});

test("blank, oversized and bad-date input is rejected safely", () => {
  assert.equal(analyze({ text: " \n\t " }).ok, false);
  assert.equal(analyze({ text: "x".repeat(150_001) }).ok, false);
  assert.equal(analyze({ text: "A: hi", referenceDate: "2026-13-45" }).ok, false);
});
