import { isAuthed } from "./_lib/auth.js";
import { redis } from "./_lib/redis.js";
import { validId } from "./_lib/records.js";
import { INBOX, migrate, readHash } from "./_lib/legacy.js";

// Problems waiting to be rated, one entry per NeetCode problem: {id, slug, site, at, source}.
//   id: "nc-<slug>" (synced from NeetCode) or "add-<slug>" (added by hand)
//   at: ISO time it was solved (synced) or added; source: "neetcode" | "manual"
const SYNC_SINCE = "lc:sync:since"; // ISO time of the newest synced commit
const SYNC_AT = "lc:sync:at"; // ms of the last GitHub check
const REPO = "jesal-g/neetcode-submissions";
const SYNC_EVERY_MS = 2 * 60 * 1000;
const COMMIT_MSG = /^Add:\s+([a-z0-9-]+)\s+-\s+submission-(\d+)/i;

// Pull new "Add: <slug> - submission-N" commits from the NeetCode sync repo.
// Several submissions of one problem become one entry with the newest solve time.
async function syncFromGitHub(force, current) {
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
  const found = {};
  for (const c of commits) {
    const at = c.commit?.author?.date;
    const m = COMMIT_MSG.exec(c.commit?.message || "");
    if (at && at > newest) newest = at;
    if (!m || !at || (since && at <= since)) continue;
    const slug = m[1].toLowerCase();
    if (!validId(slug)) continue;
    const id = `nc-${slug}`;
    const prev = found[id] || current[id];
    if (!prev || at > prev.at) found[id] = { id, slug, site: "neetcode", at, source: "neetcode" };
  }
  const entries = Object.values(found);
  if (entries.length) await redis("HSET", INBOX, ...entries.flatMap((e) => [e.id, JSON.stringify(e)]));
  if (newest && newest !== since) await redis("SET", SYNC_SINCE, newest);
  return { checked: true, added: entries.filter((e) => !current[e.id]).length };
}

async function readInbox() {
  const out = {};
  for (const [id, v] of Object.entries(await readHash(INBOX))) {
    try {
      const e = JSON.parse(v);
      if (e.slug) out[id] = e;
    } catch {
      // skip a corrupt entry
    }
  }
  return out;
}

const sorted = (entries) => Object.values(entries).sort((a, b) => String(a.at).localeCompare(String(b.at)));

// GET    /api/inbox                             -> {inbox, sync}; checks GitHub at most every 2 min
//        /api/inbox?sync=force                  -> checks GitHub now
// POST   /api/inbox {slugs: ["duplicate-integer"]} -> adds past problems by NeetCode slug
// DELETE /api/inbox?id=...                      -> removes an entry once it's rated or dismissed
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthed(req)) return res.status(401).json({ error: "Sign in first." });
  try {
    if (req.method === "GET") {
      try {
        await migrate();
      } catch (e) {
        console.error(e); // retried next load
      }
      const current = await readInbox();
      let sync;
      try {
        sync = await syncFromGitHub(req.query?.sync === "force", current);
      } catch (e) {
        console.error(e);
        sync = { checked: false, error: "Couldn't reach GitHub." };
      }
      const inbox = sync.added || sync.checked ? await readInbox() : current;
      return res.status(200).json({ inbox: sorted(inbox), sync });
    }
    if (req.method === "POST") {
      const slugs = Array.isArray(req.body?.slugs) ? req.body.slugs.map((s) => String(s).toLowerCase()) : [];
      const valid = [...new Set(slugs.filter(validId))].slice(0, 300);
      if (!valid.length) return res.status(400).json({ error: "Send 1 to 300 NeetCode problems." });
      const at = new Date().toISOString();
      await redis(
        "HSET",
        INBOX,
        ...valid.flatMap((slug) => {
          const id = `add-${slug}`;
          return [id, JSON.stringify({ id, slug, site: "neetcode", at, source: "manual" })];
        })
      );
      return res.status(200).json({ added: valid.length });
    }
    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      if (!/^[A-Za-z0-9-]{1,130}$/.test(id)) return res.status(400).json({ error: "Bad id." });
      await redis("HDEL", INBOX, id);
      return res.status(200).json({ deleted: id });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "The database didn't respond. Try again." });
  }
}
