// Generates the two secrets the LeetCode API needs and prints them.
// Usage: node scripts/totp-setup.mjs
// Then: add TOTP_SECRET and SESSION_SECRET in Vercel (Settings > Environment Variables),
// and add TOTP_SECRET to Google Authenticator ("Enter a setup key", time based).
import { randomBytes } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const bytes = randomBytes(20);
let bits = 0;
let value = 0;
let totp = "";
for (const b of bytes) {
  value = (value << 8) | b;
  bits += 8;
  while (bits >= 5) {
    totp += alphabet[(value >>> (bits - 5)) & 31];
    bits -= 5;
  }
}
if (bits > 0) totp += alphabet[(value << (5 - bits)) & 31];

const session = randomBytes(32).toString("base64url");
const uri = `otpauth://totp/jesal.zip:leetcode?secret=${totp}&issuer=jesal.zip&algorithm=SHA1&digits=6&period=30`;

console.log(`TOTP_SECRET=${totp}`);
console.log(`SESSION_SECRET=${session}`);
console.log(`\nAuthenticator link (turn into a QR code, or type the setup key by hand):\n${uri}`);
