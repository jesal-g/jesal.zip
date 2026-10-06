// Single-user auth: a Google Authenticator (TOTP, RFC 6238) code trades for a
// signed session cookie that lasts 60 days.
import { createHmac, timingSafeEqual } from "node:crypto";
import { redis } from "./redis.js";

const COOKIE = "lc_session";
export const SESSION_DAYS = 60;
const STEP = 30; // seconds per TOTP code

// Brute-force limits: a 6-digit code has 1,000,000 values, so cap guesses hard.
const FAILS_PER_IP = 5; // per 15 minutes
const FAILS_GLOBAL = 20; // per hour, across all IPs

function base32Decode(s) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = s.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error("bad base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpAt(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 0xf;
  const n = (h.readUInt32BE(off) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, "0");
}

// Returns the matching time-step (allowing one step of clock drift) or null.
export function matchTotp(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 1000 / STEP);
  for (const c of [current, current - 1, current + 1]) {
    const expected = Buffer.from(totpAt(secret, c));
    if (timingSafeEqual(expected, Buffer.from(code))) return c;
  }
  return null;
}

const sign = (payload) =>
  createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url");

export function makeSession(now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ exp: now + SESSION_DAYS * 864e5 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function validSession(value, now = Date.now()) {
  if (!value || !process.env.SESSION_SECRET) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > now;
  } catch {
    return false;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export const isAuthed = (req) => validSession(readCookie(req, COOKIE));

export function sessionCookie(value) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

const clientIp = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();

// Checks a code with rate limiting and replay protection.
// Resolves "ok", "invalid", or "locked".
export async function checkLogin(req, code) {
  const ipKey = `lc:login:fail:${clientIp(req)}`;
  const globalKey = "lc:login:fail:all";
  const [ipFails, globalFails] = await Promise.all([redis("GET", ipKey), redis("GET", globalKey)]);
  if (Number(ipFails) >= FAILS_PER_IP || Number(globalFails) >= FAILS_GLOBAL) return "locked";

  const step = matchTotp(process.env.TOTP_SECRET, String(code || "").trim());
  // Each code works once: reject a step at or before the last one used.
  const last = Number(await redis("GET", "lc:totp:last")) || 0;
  if (step !== null && step > last) {
    await redis("SET", "lc:totp:last", String(step));
    await redis("DEL", ipKey);
    return "ok";
  }
  await redis("INCR", ipKey);
  await redis("EXPIRE", ipKey, "900", "NX");
  await redis("INCR", globalKey);
  await redis("EXPIRE", globalKey, "3600", "NX");
  return "invalid";
}
