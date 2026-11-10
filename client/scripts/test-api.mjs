// End-to-end check of the /api handlers against an in-memory fake of Upstash's REST API.
// Usage: npm run test:api
const API = new URL("../api", import.meta.url).href;
process.env.KV_REST_API_URL = "https://fake-redis"; process.env.KV_REST_API_TOKEN = "t";
process.env.SESSION_SECRET = "test-session-secret"; process.env.TOTP_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const store = new Map(), hashes = new Map();
// Data saved before the switch to NeetCode slugs (records keyed by LeetCode number).
const day = (date, result) => ({ date, result });
const old = (num, attempts, extra = {}) => JSON.stringify({ num, note: "", attempts, stage: 1, next: "2026-11-20", mastered: false, added: attempts[0].date, ...extra });
hashes.set("lc:problems", new Map([
  ["217", old(217, [day("2026-10-01", "ok")], { note: "hash set" })], // NeetCode: duplicate-integer
  ["703", old(703, [day("2026-10-02", "fail")])], // matched before in lc:ncmap
  ["2000", old(2000, [day("2026-10-03", "ok")])], // not on NeetCode
  ["duplicate-integer", JSON.stringify({ id: "duplicate-integer", site: "neetcode", note: "", attempts: [day("2026-10-09", "hint")], stage: 1, next: "2026-10-12", mastered: false, added: "2026-10-09" })],
]));
hashes.set("lc:ncmap", new Map([["kth-largest-integer-in-a-stream", "703"]]));
hashes.set("lc:inbox", new Map([
  ["sha1", JSON.stringify({ id: "sha1", slug: "is-palindrome", num: null, at: "2026-10-04T10:00:00Z", source: "neetcode" })],
  ["sha2", JSON.stringify({ id: "sha2", slug: "is-palindrome", num: null, at: "2026-10-05T10:00:00Z", source: "neetcode" })],
  ["manual-146", JSON.stringify({ id: "manual-146", slug: null, num: 146, at: "2026-10-06T10:00:00Z", source: "manual" })],
]));
store.set("lc:sync:since", "2026-10-05T10:00:00Z");
const githubCommits = [
  { sha: "c4", commit: { message: "Add: two-integer-sum - submission-1", author: { date: "2026-10-07T12:00:00Z" } } },
  { sha: "c3", commit: { message: "Add: two-integer-sum - submission-0", author: { date: "2026-10-07T11:00:00Z" } } },
  { sha: "c2", commit: { message: "Add: anagram-groups - submission-0", author: { date: "2026-10-06T19:25:59Z" } } },
  { sha: "c1", commit: { message: "Initialize NeetCode solutions repository", author: { date: "2026-10-01T19:11:32Z" } } },
];
let githubCalls = 0;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith("https://api.github.com/")) {
    githubCalls++;
    const since = new URL(url).searchParams.get("since");
    return { ok: true, json: async () => githubCommits.filter((c) => !since || c.commit.author.date >= since) };
  }
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
r = await call(problems, { cookie });
const P = r.data.problems;
assert(Object.keys(P).sort().join() === "duplicate-integer,kth-largest-integer-in-a-stream,reverse-prefix-of-word", "old records move to NeetCode slugs");
assert(P["duplicate-integer"].note === "hash set" && P["duplicate-integer"].site === "neetcode" && !("num" in P["duplicate-integer"]), "moved record keeps its note, no LeetCode number");
assert(P["duplicate-integer"].attempts.map((a) => a.result).join() === "ok,hint" && P["duplicate-integer"].next === "2026-10-12", "an old and a new record of one problem merge (newer schedule wins)");
assert(P["kth-largest-integer-in-a-stream"].attempts[0].result === "fail", "old matches (lc:ncmap) are used for the move");
assert(P["reverse-prefix-of-word"].site === "leetcode", "a problem NeetCode doesn't have is kept, marked as LeetCode");
assert(store.has("lc:migrate:neetcode"), "move is recorded as done");
const rec = { id: "lru-cache", site: "neetcode", note: "hash map + list", attempts: [{ date: "2026-10-05", result: "fail" }], stage: 0, next: "2026-10-06", mastered: false, added: "2026-10-05" };
r = await call(problems, { method: "PUT", body: { records: [rec] }, cookie }); assert(r.status === 200, "save a record");
r = await call(problems, { method: "PUT", body: { records: [{ ...rec, attempts: [{ date: "x", result: "fail" }] }] }, cookie }); assert(r.status === 400, "malformed record rejected");
r = await call(problems, { method: "PUT", body: { records: [{ ...rec, id: "Not A Slug" }] }, cookie }); assert(r.status === 400, "bad id rejected");
r = await call(problems, { cookie }); assert(r.data.problems["lru-cache"]?.note === "hash map + list", "read it back");
const { id: _id, site: _site, ...oldShape } = rec;
r = await call(problems, { method: "PUT", body: { records: [{ ...oldShape, num: 1 }] }, cookie });
r = await call(problems, { cookie }); assert(r.data.problems["two-integer-sum"], "an old backup record (LeetCode number) is converted on save");
r = await call(problems, { method: "PUT", body: { records: [JSON.parse(old(217, [day("2026-09-01", "fail")]))] }, cookie });
r = await call(problems, { cookie }); assert(r.data.problems["duplicate-integer"].attempts.length === 3 && r.data.problems["duplicate-integer"].next === "2026-10-12", "restoring an old backup merges into the NeetCode record instead of replacing it");
r = await call(problems, { method: "DELETE", query: { id: "lru-cache" }, cookie }); r = await call(problems, { cookie });
assert(!r.data.problems["lru-cache"], "delete works");
for (let i = 0; i < 5; i++) await call(login, { method: "POST", body: { code: "111111" }, ip: "9.9.9.9" });
r = await call(login, { method: "POST", body: { code: totpAt(process.env.TOTP_SECRET, Math.floor(Date.now() / 30000) + 1) }, ip: "9.9.9.9" });
assert(r.status === 429, "locked after 5 wrong codes, even with a valid one");
r = await call(inbox, { cookie });
let ids = r.data.inbox.map((e) => e.id).sort().join();
assert(r.status === 200 && ids === "add-lru-cache,nc-anagram-groups,nc-is-palindrome,nc-two-integer-sum", "old inbox moved, new NeetCode solves synced");
const bySlug = Object.fromEntries(r.data.inbox.map((e) => [e.slug, e]));
assert(bySlug["is-palindrome"].at === "2026-10-05T10:00:00Z" && bySlug["two-integer-sum"].at === "2026-10-07T12:00:00Z", "several submissions of one problem make one entry (newest)");
assert(r.data.inbox.every((e) => !("num" in e)), "inbox entries carry no LeetCode number");
r = await call(inbox, { cookie, query: { sync: "force" } }); assert(r.data.inbox.length === 4 && githubCalls === 2, "re-sync doesn't duplicate");
r = await call(inbox, { cookie }); assert(githubCalls === 2 && r.data.sync.checked === false, "GitHub checked at most every 2 minutes");
r = await call(inbox, { method: "PUT", body: { slug: "x", num: 1 }, cookie }); assert(r.status === 405, "no more LeetCode matching");
r = await call(inbox, { method: "POST", body: { slugs: ["duplicate-integer", "duplicate-integer", "Bad Slug"] }, cookie }); assert(r.data.added === 1, "add past problems by NeetCode slug (deduped, bad ones skipped)");
r = await call(inbox, { method: "DELETE", query: { id: "nc-two-integer-sum" }, cookie }); r = await call(inbox, { cookie }); assert(r.data.inbox.length === 4, "remove a rated entry");
r = await call(inbox); assert(r.status === 401, "inbox needs sign-in");
r = await call(settings, { cookie }); assert(r.status === 200 && r.data.break === null, "no break by default");
r = await call(settings, { method: "PUT", body: { break: { start: "2026-10-15" } }, cookie }); assert(r.data.break?.start === "2026-10-15", "schedule a break");
r = await call(settings, { cookie }); assert(r.data.break?.start === "2026-10-15", "break is remembered");
r = await call(settings, { method: "PUT", body: { break: { start: "soon" } }, cookie }); assert(r.status === 400, "bad break date rejected");
r = await call(settings, { method: "PUT", body: { break: null }, cookie }); assert(r.data.break === null, "end the break");
r = await call(settings); assert(r.status === 401, "settings need sign-in");
console.log("all API checks passed");
