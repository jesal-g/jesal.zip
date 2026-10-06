import { checkLogin, makeSession, sessionCookie } from "./_lib/auth.js";

// POST /api/login {code: "123456"} -> sets a 60-day session cookie on success
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const outcome = await checkLogin(req, req.body?.code);
    if (outcome === "locked") {
      return res.status(429).json({ error: "Too many wrong codes. Try again in 15 minutes." });
    }
    if (outcome !== "ok") return res.status(401).json({ error: "That code didn't work. Check your authenticator and try again." });
    res.setHeader("Set-Cookie", sessionCookie(makeSession()));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Login is unavailable right now." });
  }
}
