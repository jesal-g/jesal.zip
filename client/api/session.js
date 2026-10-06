import { isAuthed } from "./_lib/auth.js";
import { redisConfigured } from "./_lib/redis.js";

// GET /api/session -> whether this browser is signed in, and whether the server is set up
export default function handler(req, res) {
  const configured =
    redisConfigured() && Boolean(process.env.TOTP_SECRET) && Boolean(process.env.SESSION_SECRET);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ authed: configured && isAuthed(req), configured });
}
