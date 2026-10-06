import { clearCookie } from "./_lib/auth.js";

// POST /api/logout -> clears the session cookie on this device
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  res.setHeader("Set-Cookie", clearCookie());
  res.status(200).json({ ok: true });
}
