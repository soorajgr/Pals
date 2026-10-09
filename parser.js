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
  if (looksLikeWhatsApp(input)) {
    return parseWhatsApp(input);
  }

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

/*
 * WhatsApp exports.
 *   Android: 09/10/26, 10:30 am - Name: message
 *   iPhone:  [09/10/2026, 10:30:15 AM] Name: message
 * A line with no timestamp continues the previous message.
 * Lines with no "Name:" (e.g. encryption notice, "X added Y") are system lines.
 * Timestamps are kept exactly as supplied: day/month order is ambiguous.
 */
const WHATSAPP_IOS =
  /^\[((?!\d{4}-\d{2}-\d{2})\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?)\]\s*(.*)$/i;

const WHATSAPP_ANDROID =
  /^((?!\d{4}-\d{2}-\d{2})\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?)\s+-\s+(.*)$/i;

function whatsappHeader(line) {
  // iPhone exports start lines with invisible direction marks.
  const clean = line.replace(/^[\u200e\u200f\ufeff]+/, "");
  const match = clean.match(WHATSAPP_IOS) || clean.match(WHATSAPP_ANDROID);

  return match
    ? { timestamp: `${match[1]}, ${match[2]}`, rest: match[3] }
    : null;
}

function looksLikeWhatsApp(input) {
  const lines = input.split(/\r\n|\n|\r/).filter((line) => line.trim());
  const headers = lines.filter((line) => whatsappHeader(line)).length;

  return headers >= 2 || (headers === 1 && whatsappHeader(lines[0]) !== null);
}

function parseWhatsApp(input) {
  const messages = [];

  for (const raw of input.split(/\r\n|\n|\r/)) {
    if (!raw.trim()) {
      continue;
    }

    const header = whatsappHeader(raw);

    if (header) {
      const named = header.rest.match(/^([^:]{1,80}):\s+(.*)$/);

      messages.push({
        id: `message-${messages.length + 1}`,
        author: named ? named[1].trim() : null,
        timestamp: header.timestamp,
        text: named ? named[2] : header.rest,
        raw,
        system: !named
      });
    } else if (messages.length > 0) {
      const previous = messages[messages.length - 1];
      previous.raw += `\n${raw}`;
      previous.text += `\n${raw.trim()}`;
    } else {
      messages.push({
        id: "message-1",
        author: null,
        timestamp: null,
        text: raw.trim(),
        raw,
        system: true
      });
    }
  }

  return messages;
}
