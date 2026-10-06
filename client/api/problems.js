import { isAuthed } from "./_lib/auth.js";
import { redis } from "./_lib/redis.js";
import { cleanRecord } from "./_lib/records.js";

const KEY = "lc:problems"; // Redis hash: problem number -> JSON record

// GET    /api/problems            -> { problems: { "146": {...}, ... } }
// PUT    /api/problems {records}  -> saves up to 500 records (create or replace)
// DELETE /api/problems?num=146    -> removes one problem
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthed(req)) return res.status(401).json({ error: "Sign in first." });
  try {
    if (req.method === "GET") {
      const flat = (await redis("HGETALL", KEY)) || [];
      const problems = {};
      for (let i = 0; i < flat.length; i += 2) {
        try {
          problems[flat[i]] = JSON.parse(flat[i + 1]);
        } catch {
          // skip a corrupt entry rather than failing the whole list
        }
      }
      return res.status(200).json({ problems });
    }
    if (req.method === "PUT") {
      const input = req.body?.records;
      if (!Array.isArray(input) || input.length === 0 || input.length > 500) {
        return res.status(400).json({ error: "Send 1 to 500 records." });
      }
      const records = input.map(cleanRecord);
      if (records.some((r) => !r)) return res.status(400).json({ error: "A record is malformed." });
      await redis("HSET", KEY, ...records.flatMap((r) => [String(r.num), JSON.stringify(r)]));
      return res.status(200).json({ saved: records.length });
    }
    if (req.method === "DELETE") {
      const num = Number(req.query?.num);
      if (!Number.isInteger(num) || num < 1) return res.status(400).json({ error: "Bad problem number." });
      await redis("HDEL", KEY, String(num));
      return res.status(200).json({ deleted: num });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "The database didn't respond. Try again." });
  }
}
