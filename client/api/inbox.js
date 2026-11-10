import { isAuthed } from "./_lib/auth.js";
import { redis } from "./_lib/redis.js";
import { INBOX, cleanupNeetcode, readHash } from "./_lib/cleanup.js";

// Problems waiting to be rated, by LeetCode number. Each entry: {id, num, at, source}.
//   at: ISO time it was solved or added
//   source: "manual" (added by number, rated as today) | "solved" (rated on the `at` date)

async function listInbox() {
  const inbox = [];
  for (const v of Object.values(await readHash(INBOX))) {
    try {
      const e = JSON.parse(v);
      if (Number.isInteger(e.num)) inbox.push(e);
    } catch {
      // skip a corrupt entry
    }
  }
  inbox.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return inbox;
}

// GET    /api/inbox                       -> {inbox, cleanup?}
// POST   /api/inbox {nums: [1, 146]}      -> adds problems by LeetCode number
// DELETE /api/inbox?id=...                -> removes an entry once it's rated or dismissed
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthed(req)) return res.status(401).json({ error: "Sign in first." });
  try {
    if (req.method === "GET") {
      let cleanup = null;
      try {
        cleanup = await cleanupNeetcode();
      } catch (e) {
        console.error(e); // try again next time; the inbox still loads
      }
      const inbox = await listInbox();
      return res.status(200).json(cleanup ? { inbox, cleanup } : { inbox });
    }
    if (req.method === "POST") {
      const nums = Array.isArray(req.body?.nums) ? req.body.nums.map(Number) : [];
      const valid = [...new Set(nums.filter((n) => Number.isInteger(n) && n > 0 && n < 100000))].slice(0, 300);
      if (!valid.length) return res.status(400).json({ error: "Send 1 to 300 problem numbers." });
      const at = new Date().toISOString();
      await redis(
        "HSET",
        INBOX,
        ...valid.flatMap((n) => [`manual-${n}`, JSON.stringify({ id: `manual-${n}`, num: n, at, source: "manual" })])
      );
      return res.status(200).json({ added: valid.length });
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
