"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createServer, HOST } = require("../server");

function request(port, { method = "GET", path = "/", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port, method, path, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const json = { "Content-Type": "application/json" };

test("server", async (t) => {
  const server = createServer();
  await new Promise((r) => server.listen(0, HOST, r));
  const port = server.address().port;
  t.after(() => server.close());

  await t.test("binds to loopback only", () => {
    assert.equal(server.address().address, "127.0.0.1");
  });

  await t.test("serves the app with security headers", async () => {
    const res = await request(port, { path: "/" });
    assert.equal(res.status, 200);
    assert.match(res.body, /What Did I Miss/);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.match(res.headers["content-security-policy"], /connect-src 'self'/);
    assert.equal(res.headers["cache-control"], "no-store");
  });

  await t.test("does not serve files outside the allow-list", async () => {
    for (const p of ["/server.js", "/core.js", "/../package.json", "/prompt.md"]) {
      assert.equal((await request(port, { path: p })).status, 404, p);
    }
  });

  await t.test("POST /api/analyze returns items", async () => {
    const res = await request(port, {
      method: "POST",
      path: "/api/analyze",
      headers: json,
      body: JSON.stringify({
        text: "Maya: Decision: ship Friday.\nMaya: @Asha please review by 2026-10-12.",
        username: "Asha",
        referenceDate: "2026-10-09"
      })
    });
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.ok(data.items.some((i) => i.category === "Decision"));
    assert.ok(data.items.some((i) => i.category === "Mention"));
  });

  await t.test("rejects bad method, content type, JSON, input and size", async () => {
    assert.equal((await request(port, { path: "/api/analyze" })).status, 405);
    assert.equal(
      (await request(port, { method: "POST", path: "/api/analyze", headers: { "Content-Type": "text/plain" }, body: "x" })).status,
      415
    );
    assert.equal(
      (await request(port, { method: "POST", path: "/api/analyze", headers: json, body: "{nope" })).status,
      400
    );
    assert.equal(
      (await request(port, { method: "POST", path: "/api/analyze", headers: json, body: JSON.stringify({ text: "" }) })).status,
      400
    );
    const big = await request(port, {
      method: "POST",
      path: "/api/analyze",
      headers: json,
      body: JSON.stringify({ text: "a".repeat(700_000) })
    });
    assert.equal(big.status, 413);
  });

  await t.test("rejects a foreign Host header", async () => {
    const res = await request(port, { path: "/", headers: { Host: "evil.example" } });
    assert.equal(res.status, 403);
  });

  await t.test("never writes conversation text to stdout or stderr", async () => {
    const secret = "TOPSECRETCHATLINE";
    const seen = [];
    const wrap = (stream) => {
      const orig = stream.write.bind(stream);
      stream.write = (chunk, ...rest) => { seen.push(String(chunk)); return orig(chunk, ...rest); };
      return () => (stream.write = orig);
    };
    const restoreOut = wrap(process.stdout);
    const restoreErr = wrap(process.stderr);
    try {
      await request(port, {
        method: "POST", path: "/api/analyze", headers: json,
        body: JSON.stringify({ text: `Maya: Decision: ${secret}` })
      });
    } finally { restoreOut(); restoreErr(); }
    assert.ok(!seen.join("").includes(secret));
  });
});
