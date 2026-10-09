"use strict";

/*
 * score.js
 * Transparent priority scoring with a reason for every point.
 */

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
