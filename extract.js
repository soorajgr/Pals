"use strict";

/*
 * extract.js
 * Rule-based extraction: mentions, deadlines, owners, categories.
 */

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
      /\bdecision\s*:|\b(?:we decided|we agreed|it is decided|approved|confirmed|finalized)\b|\bagreed\s*[:,]/i.test(
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

/*
 * Analyze only the messages after the one the user last read.
 * Message objects keep their original ids, so source links still match.
 */
function analyzeUnread(messages, options, lastRead) {
  return analyzeMessages(messages.slice(lastRead), options);
}
