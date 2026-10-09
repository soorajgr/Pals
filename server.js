"use strict";

/*
 * server.js
 * Optional local server. Binds to 127.0.0.1 only, serves the app files and
 * exposes POST /api/analyze. Conversation text is never logged or stored.
 *
 * Usage: node server.js [port]   (default 3000)
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { analyze } = require("./core");

const HOST = "127.0.0.1";
const MAX_BODY_BYTES = 600_000;

const STATIC_FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/utils.js": ["utils.js", "text/javascript; charset=utf-8"],
  "/parser.js": ["parser.js", "text/javascript; charset=utf-8"],
  "/extract.js": ["extract.js", "text/javascript; charset=utf-8"],
  "/score.js": ["score.js", "text/javascript; charset=utf-8"],
  "/tests.js": ["tests.js", "text/javascript; charset=utf-8"],
  "/ui.js": ["ui.js", "text/javascript; charset=utf-8"]
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
};

function send(res, status, body, type) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"] || 0);
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    const refuse = () => {
      if (!tooLarge) {
        tooLarge = true;
        reject(Object.assign(new Error("too large"), { status: 413 }));
      }
    };

    if (declared > MAX_BODY_BYTES) {
      refuse();
    }

    req.on("data", (chunk) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        refuse();
        chunks.length = 0; // discard; keep draining so the reply can be sent
        return;
      }

      if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      if (!tooLarge) {
        resolve(Buffer.concat(chunks).toString("utf8"));
      }
    });
    req.on("error", reject);
  });
}

// Rejects requests whose Host header is not this machine (DNS-rebinding guard).
function hostAllowed(req) {
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(req.headers.host || "");
}

async function handle(req, res) {
  if (!hostAllowed(req)) {
    return sendJson(res, 403, { error: "Forbidden host." });
  }

  const url = new URL(req.url, `http://${HOST}`);

  if (url.pathname === "/api/analyze") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { error: "Use POST." });
    }

    if (!/^application\/json/i.test(req.headers["content-type"] || "")) {
      return sendJson(res, 415, { error: "Send application/json." });
    }

    let payload;

    try {
      payload = JSON.parse(await readBody(req));
    } catch (error) {
      return error.status === 413
        ? (res.setHeader("Connection", "close"),
          sendJson(res, 413, { error: "Request too large." }))
        : sendJson(res, 400, { error: "Invalid JSON." });
    }

    const result = analyze(payload || {});

    return result.ok
      ? sendJson(res, 200, result)
      : sendJson(res, 400, { error: result.error });
  }

  if (url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true });
  }

  const entry = STATIC_FILES[url.pathname];

  if (req.method !== "GET" || !entry) {
    return sendJson(res, 404, { error: "Not found." });
  }

  const file = fs.readFileSync(path.join(__dirname, entry[0]), "utf8");
  return send(res, 200, file, entry[1]);
}

function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Internal error." });
      }
    });
  });
}

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 3000);

  createServer().listen(port, HOST, () => {
    console.log(`What Did I Miss? running at http://${HOST}:${port}`);
    console.log("Local only. Conversation text is never logged or stored.");
  });
}

module.exports = { createServer, HOST };
