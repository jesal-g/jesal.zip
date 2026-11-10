// End-to-end check of the /api handlers against an in-memory fake of Upstash's REST API.
// Usage: npm run test:api
const API = new URL("../api", import.meta.url).href;
process.env.KV_REST_API_URL = "https://fake-redis"; process.env.KV_REST_API_TOKEN = "t";
process.env.SESSION_SECRET = "test-session-secret"; process.env.TOTP_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const store = new Map(), hashes = new Map();
// Inbox left by the old NeetCode sync, to check the one-time cleanup.
const nc = (slug, at) => JSON.stringify({ id: "x", slug, num: null, at, source: "neetcode" });
hashes.set("lc:inbox", new Map([
  ["c2", nc("kth-largest-integer-in-a-stream", "2026-06-21T19:25:59Z")], // matched before (lc:ncmap)
  ["c3", nc("two-sum", "2026-06-22T10:00:00Z")], // same slug as LeetCode
  ["c4", nc("two-sum", "2026-06-23T10:00:00Z")], // second submission of it
  ["c5", nc("some-renamed-problem", "2026-06-24T10:00:00Z")], // never matched
  ["manual-20", JSON.stringify({ id: "manual-20", slug: null, num: 20, at: "2026-06-25T10:00:00Z", source: "manual" })],
]));
hashes.set("lc:ncmap", new Map([["kth-largest-integer-in-a-stream", "703"]]));
store.set("lc:sync:since", "2026-06-24T10:00:00Z"); store.set("lc:sync:at", "1");
let outsideCalls = 0;
globalThis.fetch = async (url, opts) => {
  if (url !== "https://fake-redis") { outsideCalls++; throw new Error("unexpected fetch " + url); }
  const [cmd, ...a] = JSON.parse(opts.body); let result = null;
  switch (cmd) {
    case "GET": result = store.get(a[0]) ?? null; break;
    case "SET": store.set(a[0], a[1]); result = "OK"; break;
    case "DEL": a.forEach((k) => { store.delete(k); hashes.delete(k); }); result = 1; break;
    case "INCR": store.set(a[0], String(Number(store.get(a[0]) || 0) + 1)); result = Number(store.get(a[0])); break;
    case "EXPIRE": result = 1; break;
    case "HSET": { const h = hashes.get(a[0]) || new Map(); for (let i = 1; i < a.length; i += 2) h.set(a[i], a[i+1]); hashes.set(a[0], h); result = 1; break; }
    case "HGETALL": result = [...(hashes.get(a[0]) || new Map())].flat(); break;
    case "HDEL": a.slice(1).forEach((f) => hashes.get(a[0])?.delete(f)); result = 1; break;
    default: throw new Error("unhandled " + cmd);
  }
  return { ok: true, json: async () => ({ result }) };
};
const { totpAt } = await import(`${API}/_lib/auth.js`);
const login = (await import(`${API}/login.js`)).default;
const problems = (await import(`${API}/problems.js`)).default;
const session = (await import(`${API}/session.js`)).default;
const inbox = (await import(`${API}/inbox.js`)).default;
const settings = (await import(`${API}/settings.js`)).default;
function call(handler, { method = "GET", body, query, cookie, ip = "1.1.1.1" } = {}) {
  return new Promise((resolve) => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; }, json(d) { resolve({ status: this.statusCode, data: d, headers: this.headers }); } };
    handler({ method, body, query: query || {}, headers: { cookie, "x-forwarded-for": ip } }, res);
  });
}
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok -", m); };
assert(totpAt("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1) === "287082", "TOTP matches RFC 6238 test vector");
let r = await call(session); assert(r.data.configured && !r.data.authed, "session: configured, signed out");
r = await call(problems); assert(r.status === 401, "problems needs sign-in");
r = await call(login, { method: "POST", body: { code: "000000" } }); assert(r.status === 401, "wrong code rejected");
const good = totpAt(process.env.TOTP_SECRET, Math.floor(Date.now() / 30000));
r = await call(login, { method: "POST", body: { code: good } }); assert(r.status === 200, "right code accepted");
const cookieHeader = r.headers["Set-Cookie"]; assert(/HttpOnly; Secure; SameSite=Strict; Max-Age=5184000/.test(cookieHeader), "cookie is HttpOnly/Secure/60 days");
const cookie = cookieHeader.split(";")[0];
r = await call(login, { method: "POST", body: { code: good }, ip: "2.2.2.2" }); assert(r.status === 401, "same code can't be reused");
r = await call(session, { cookie }); assert(r.data.authed, "session cookie recognized");
r = await call(session, { cookie: cookie.slice(0, -2) + "xx" }); assert(!r.data.authed, "tampered cookie rejected");
const rec = { num: 146, note: "hash map + list", attempts: [{ date: "2026-10-05", result: "fail" }], stage: 0, next: "2026-10-06", mastered: false, added: "2026-10-05" };
r = await call(problems, { method: "PUT", body: { records: [rec] }, cookie }); assert(r.status === 200, "save a record");
r = await call(problems, { method: "PUT", body: { records: [{ ...rec, attempts: [{ date: "x", result: "fail" }] }] }, cookie }); assert(r.status === 400, "malformed record rejected");
r = await call(problems, { cookie }); assert(r.data.problems["146"]?.note === "hash map + list", "read it back");
r = await call(problems, { method: "DELETE", query: { num: "146" }, cookie }); r = await call(problems, { cookie });
assert(!r.data.problems["146"], "delete works");
for (let i = 0; i < 5; i++) await call(login, { method: "POST", body: { code: "111111" }, ip: "9.9.9.9" });
r = await call(login, { method: "POST", body: { code: totpAt(process.env.TOTP_SECRET, Math.floor(Date.now() / 30000) + 1) }, ip: "9.9.9.9" });
assert(r.status === 429, "locked after 5 wrong codes, even with a valid one");
await call(problems, { method: "PUT", body: { records: [{ ...rec, num: 703 }] }, cookie });
r = await call(inbox, { cookie });
const byNum = Object.fromEntries(r.data.inbox.map((e) => [e.num, e]));
assert(r.status === 200 && r.data.inbox.length === 3 && byNum[703] && byNum[1] && byNum[20], "cleanup turns NeetCode entries into LeetCode numbers");
assert(byNum[703].at === "2026-06-21T19:25:59Z" && byNum[703].source === "solved" && !("slug" in byNum[703]), "converted entry keeps its solve date, no slug");
assert(byNum[1].at === "2026-06-23T10:00:00Z", "two submissions of one problem become one entry (newest)");
assert(JSON.stringify(r.data.cleanup) === JSON.stringify({ converted: 2, dropped: ["some-renamed-problem"] }), "cleanup reports what it dropped");
assert(!hashes.has("lc:ncmap") && !store.has("lc:sync:since") && !store.has("lc:sync:at"), "old NeetCode keys removed");
r = await call(problems, { cookie }); assert(r.data.problems["703"]?.note === "hash map + list", "rated problems untouched by cleanup");
r = await call(inbox, { cookie }); assert(r.data.inbox.length === 3 && !r.data.cleanup, "cleanup runs once");
assert(outsideCalls === 0, "no calls outside the database");
r = await call(inbox, { method: "PUT", body: { slug: "two-sum", num: 1 }, cookie }); assert(r.status === 405, "slug matching is gone");
r = await call(inbox, { method: "POST", body: { nums: [1, 146, 146] }, cookie }); assert(r.data.added === 2, "add problems by number (deduped)");
r = await call(inbox, { cookie }); assert(r.data.inbox.length === 5 && r.data.inbox.every((e) => Number.isInteger(e.num)), "inbox lists them by number");
r = await call(inbox, { method: "DELETE", query: { id: "solved-703" }, cookie }); r = await call(inbox, { cookie }); assert(r.data.inbox.length === 4, "remove a rated entry");
r = await call(inbox); assert(r.status === 401, "inbox needs sign-in");
r = await call(settings, { cookie }); assert(r.status === 200 && r.data.break === null, "no break by default");
r = await call(settings, { method: "PUT", body: { break: { start: "2026-10-15" } }, cookie }); assert(r.data.break?.start === "2026-10-15", "schedule a break");
r = await call(settings, { cookie }); assert(r.data.break?.start === "2026-10-15", "break is remembered");
r = await call(settings, { method: "PUT", body: { break: { start: "soon" } }, cookie }); assert(r.status === 400, "bad break date rejected");
r = await call(settings, { method: "PUT", body: { break: null }, cookie }); assert(r.data.break === null, "end the break");
r = await call(settings); assert(r.status === 401, "settings need sign-in");
console.log("all API checks passed");
