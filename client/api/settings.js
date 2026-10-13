import { isAuthed } from "./_lib/auth.js";
import { redis } from "./_lib/redis.js";

const KEY = "lc:settings"; // JSON: { break: { start: "YYYY-MM-DD" } | null }
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/settings                      -> { break: {start} | null }
// PUT /api/settings { break: {start} }   -> schedule or start a break
// PUT /api/settings { break: null }      -> end the break (the page shifts dates first)
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthed(req)) return res.status(401).json({ error: "Sign in first." });
  try {
    const stored = JSON.parse((await redis("GET", KEY)) || "{}");
    if (req.method === "GET") return res.status(200).json({ break: stored.break || null });
    if (req.method === "PUT") {
      const b = req.body?.break;
      if (b !== null && !(b && DATE.test(b.start))) {
        return res.status(400).json({ error: "Send break: {start: YYYY-MM-DD} or null." });
      }
      const next = { ...stored, break: b ? { start: b.start } : null };
      await redis("SET", KEY, JSON.stringify(next));
      return res.status(200).json({ break: next.break });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "The database didn't respond. Try again." });
  }
}
