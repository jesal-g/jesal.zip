import { isAuthed } from "./_lib/auth.js";
import { redis } from "./_lib/redis.js";
import { SITES, validId } from "./_lib/records.js";
import { readHash } from "./_lib/legacy.js";

// Your own additions to the pattern list, and moves of listed problems to another pattern.
// Redis hash lc:patterns: problem id -> {id, site, pattern}
const KEY = "lc:patterns";

const cleanPattern = (p) => (typeof p === "string" ? p.trim().replace(/\s+/g, " ") : "");

// GET    /api/patterns                                  -> {custom: {id: {id, site, pattern}}}
// PUT    /api/patterns {id, site, pattern}              -> add a problem or move it to a pattern
// DELETE /api/patterns?id=...                           -> undo (back to the built-in list)
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthed(req)) return res.status(401).json({ error: "Sign in first." });
  try {
    if (req.method === "GET") {
      const custom = {};
      for (const [id, v] of Object.entries(await readHash(KEY))) {
        try {
          custom[id] = JSON.parse(v);
        } catch {
          // skip a corrupt entry
        }
      }
      return res.status(200).json({ custom });
    }
    if (req.method === "PUT") {
      const { id, site = "neetcode" } = req.body || {};
      const pattern = cleanPattern(req.body?.pattern);
      if (!validId(id) || !SITES.has(site)) return res.status(400).json({ error: "Bad problem." });
      if (!pattern || pattern.length > 60) return res.status(400).json({ error: "Pattern name: 1 to 60 characters." });
      const entry = { id, site, pattern };
      await redis("HSET", KEY, id, JSON.stringify(entry));
      return res.status(200).json(entry);
    }
    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      if (!validId(id)) return res.status(400).json({ error: "Bad problem." });
      await redis("HDEL", KEY, id);
      return res.status(200).json({ deleted: id });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "The database didn't respond. Try again." });
  }
}
