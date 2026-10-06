import { isAuthed } from "./_lib/auth.js";
import { redis } from "./_lib/redis.js";

// Problems waiting to be rated: NeetCode submissions synced from GitHub, plus past
// problems added by number. Each entry: {id, slug, num, at, source}.
//   slug: NeetCode's problem slug (synced entries), num: LeetCode number when known,
//   at: ISO time it was solved/added, source: "neetcode" | "manual".
const INBOX = "lc:inbox"; // hash: id -> JSON entry
const MAP = "lc:ncmap"; // hash: NeetCode slug -> LeetCode number
const SYNC_SINCE = "lc:sync:since"; // ISO time of the newest synced commit
const SYNC_AT = "lc:sync:at"; // ms of the last GitHub check
const REPO = "jesal-g/neetcode-submissions";
const SYNC_EVERY_MS = 2 * 60 * 1000;
const COMMIT_MSG = /^Add:\s+([a-z0-9-]+)\s+-\s+submission-(\d+)/i;

async function readHash(key) {
  const flat = (await redis("HGETALL", key)) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

// Pull new "Add: <slug> - submission-N" commits from the NeetCode sync repo.
async function syncFromGitHub(force) {
  const last = Number(await redis("GET", SYNC_AT)) || 0;
  if (!force && Date.now() - last < SYNC_EVERY_MS) return { checked: false };
  await redis("SET", SYNC_AT, String(Date.now()));
  const since = await redis("GET", SYNC_SINCE);
  const params = new URLSearchParams({ per_page: "100" });
  if (since) params.set("since", since);
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits?${params}`, {
    headers: { "User-Agent": "jesal.zip-leetcode", Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return { checked: false, error: `GitHub answered ${res.status}` };
  const commits = await res.json();
  let newest = since || "";
  let added = 0;
  const fields = [];
  for (const c of commits) {
    const at = c.commit?.author?.date;
    const m = COMMIT_MSG.exec(c.commit?.message || "");
    if (at && at > newest) newest = at;
    if (!m || !at || (since && at <= since)) continue;
    fields.push(c.sha, JSON.stringify({ id: c.sha, slug: m[1].toLowerCase(), num: null, at, source: "neetcode" }));
    added++;
  }
  if (fields.length) await redis("HSET", INBOX, ...fields);
  if (newest && newest !== since) await redis("SET", SYNC_SINCE, newest);
  return { checked: true, added };
}

async function listInbox() {
  const [rawInbox, map] = await Promise.all([readHash(INBOX), readHash(MAP)]);
  const inbox = [];
  for (const v of Object.values(rawInbox)) {
    try {
      inbox.push(JSON.parse(v));
    } catch {
      // skip a corrupt entry
    }
  }
  inbox.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const numMap = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Number(v)]));
  return { inbox, map: numMap };
}

// GET    /api/inbox                       -> {inbox, map, sync}; checks GitHub at most every 2 min
//        /api/inbox?sync=force            -> checks GitHub now
// POST   /api/inbox {nums: [1, 146]}      -> adds past problems by LeetCode number
// PUT    /api/inbox {slug, num}           -> remembers which LeetCode number a NeetCode slug is
// DELETE /api/inbox?id=...                -> removes an entry once it's rated or dismissed
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthed(req)) return res.status(401).json({ error: "Sign in first." });
  try {
    if (req.method === "GET") {
      let sync;
      try {
        sync = await syncFromGitHub(req.query?.sync === "force");
      } catch (e) {
        console.error(e);
        sync = { checked: false, error: "Couldn't reach GitHub." };
      }
      return res.status(200).json({ ...(await listInbox()), sync });
    }
    if (req.method === "POST") {
      const nums = Array.isArray(req.body?.nums) ? req.body.nums.map(Number) : [];
      const valid = [...new Set(nums.filter((n) => Number.isInteger(n) && n > 0 && n < 100000))].slice(0, 300);
      if (!valid.length) return res.status(400).json({ error: "Send 1 to 300 problem numbers." });
      const at = new Date().toISOString();
      await redis(
        "HSET",
        INBOX,
        ...valid.flatMap((n) => [`manual-${n}`, JSON.stringify({ id: `manual-${n}`, slug: null, num: n, at, source: "manual" })])
      );
      return res.status(200).json({ added: valid.length });
    }
    if (req.method === "PUT") {
      const slug = String(req.body?.slug || "");
      const num = Number(req.body?.num);
      if (!/^[a-z0-9-]{1,120}$/.test(slug) || !Number.isInteger(num) || num < 1) {
        return res.status(400).json({ error: "Bad slug or number." });
      }
      await redis("HSET", MAP, slug, String(num));
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      if (!/^[A-Za-z0-9-]{1,80}$/.test(id)) return res.status(400).json({ error: "Bad id." });
      await redis("HDEL", INBOX, id);
      return res.status(200).json({ deleted: id });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "The database didn't respond. Try again." });
  }
}
