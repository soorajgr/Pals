"use strict";

/*
 * parser.js
 * Turns pasted text into message objects.
 */

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
 * Validates the optional "last message I read" number.
 * Empty means 0 (analyze everything). Returns { ok, value } or { ok, error }.
 */
function parseLastRead(raw, total) {
  const text = String(raw ?? "").trim();

  if (text === "") {
    return { ok: true, value: 0 };
  }

  if (!/^\d+$/.test(text)) {
    return { ok: false, error: "Last-read must be a whole number (0 or more)." };
  }

  const value = Number(text);

  if (value > total) {
    return {
      ok: false,
      error: `Last-read must be between 0 and ${total} for this conversation.`
    };
  }

  return { ok: true, value };
}
