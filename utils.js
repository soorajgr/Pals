"use strict";

/*
 * utils.js
 * Shared helpers and limits. Loaded first.
 */

const $ = (id) => document.getElementById(id);

const MAX_CHARACTERS = 150_000;
const MAX_FILE_BYTES = 500_000;

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
