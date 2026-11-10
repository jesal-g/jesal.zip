import { isAuthed } from "./_lib/auth.js";
import { redis } from "./_lib/redis.js";
import { cleanRecord, mergeRecords, validId } from "./_lib/records.js";
import { PROBLEMS as KEY, makeConverter, migrate, readHash } from "./_lib/legacy.js";

// Redis hash lc:problems: NeetCode slug -> JSON record (see _lib/records.js)
// GET    /api/problems                  -> { problems: { "duplicate-integer": {...}, ... } }
// PUT    /api/problems {records}        -> saves up to 500 records (create or replace);
//                                          old records with a LeetCode `num` are converted
// DELETE /api/problems?id=lru-cache     -> removes one problem
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthed(req)) return res.status(401).json({ error: "Sign in first." });
  try {
    if (req.method === "GET") {
      let warning;
      try {
        await migrate();
      } catch (e) {
        console.error(e); // old records stay in place and the move is retried next load
        warning = "Some problems saved by LeetCode number couldn't be converted yet. Reload to try again.";
      }
      const flat = (await redis("HGETALL", KEY)) || [];
      const problems = {};
      for (let i = 0; i < flat.length; i += 2) {
        try {
          const r = JSON.parse(flat[i + 1]);
          if (r.id) problems[flat[i]] = r;
        } catch {
          // skip a corrupt entry rather than failing the whole list
        }
      }
      return res.status(200).json(warning ? { problems, warning } : { problems });
    }
    if (req.method === "PUT") {
      const input = req.body?.records;
      if (!Array.isArray(input) || input.length === 0 || input.length > 500) {
        return res.status(400).json({ error: "Send 1 to 500 records." });
      }
      const isOld = (r) => r && r.id === undefined;
      const convert = input.some(isOld) ? await makeConverter() : null;
      let records = input.map((r) => cleanRecord(r, convert));
      if (records.some((r) => !r)) return res.status(400).json({ error: "A record is malformed." });
      if (convert) {
        // An old record (from a backup) may be a problem already saved under its NeetCode slug
        const stored = await readHash(KEY);
        records = records.map((r, i) => {
          if (!isOld(input[i]) || !stored[r.id]) return r;
          try {
            return mergeRecords(JSON.parse(stored[r.id]), r);
          } catch {
            return r;
          }
        });
      }
      await redis("HSET", KEY, ...records.flatMap((r) => [r.id, JSON.stringify(r)]));
      return res.status(200).json({ saved: records.length });
    }
    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      if (!validId(id)) return res.status(400).json({ error: "Bad problem id." });
      await redis("HDEL", KEY, id);
      return res.status(200).json({ deleted: id });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "The database didn't respond. Try again." });
  }
}
