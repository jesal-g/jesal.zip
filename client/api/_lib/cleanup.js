// One-time cleanup of inbox entries left by the old NeetCode sync.
// Rated problems live in lc:problems and are never touched here. Each unrated NeetCode
// entry becomes a LeetCode entry ({num, at, source: "solved"}) when its number is known:
// from the old slug matches (lc:ncmap) or from an exact LeetCode slug in the catalog.
// Entries that can't be identified are removed and their slugs kept in the done marker.
import { createRequire } from "node:module";
import { redis } from "./redis.js";

export const INBOX = "lc:inbox";
const DONE = "lc:cleanup:neetcode"; // JSON {at, converted, dropped: [slugs]} once done
const OLD_KEYS = ["lc:ncmap", "lc:sync:since", "lc:sync:at"];

let done = false; // skip the Redis check once this instance has seen the marker

export async function readHash(key) {
  const flat = (await redis("HGETALL", key)) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

function catalogSlugs() {
  try {
    const require = createRequire(import.meta.url);
    const c = require("../../public/leetcode-catalog.json");
    return new Map(c.rows.map((r) => [r[2], r[0]]));
  } catch (e) {
    console.error("catalog not available for cleanup", e);
    return new Map();
  }
}

// Returns null when there was nothing to do, else {converted, dropped}.
export async function cleanupNeetcode() {
  if (done) return null;
  if (await redis("GET", DONE)) {
    done = true;
    return null;
  }
  const [raw, ncmap] = await Promise.all([readHash(INBOX), readHash("lc:ncmap")]);
  const old = [];
  for (const [id, v] of Object.entries(raw)) {
    try {
      const e = JSON.parse(v);
      if (e.source === "neetcode" || (e.slug && !e.num)) old.push({ id, ...e });
    } catch {
      old.push({ id }); // corrupt entry: remove it too
    }
  }
  let slugs = null;
  const best = new Map(); // LeetCode number -> newest solve of it
  const dropped = [];
  for (const e of old) {
    let num = Number(e.num) || Number(ncmap[e.slug]) || null;
    if (!num && e.slug) {
      slugs ??= catalogSlugs();
      num = slugs.get(e.slug) || null;
    }
    if (!num || !e.at) {
      if (e.slug) dropped.push(e.slug);
      continue;
    }
    const prev = best.get(num);
    if (!prev || e.at > prev.at) best.set(num, { id: `solved-${num}`, num, at: e.at, source: "solved" });
  }
  const fields = [...best.values()].flatMap((e) => [e.id, JSON.stringify(e)]);
  if (fields.length) await redis("HSET", INBOX, ...fields);
  if (old.length) await redis("HDEL", INBOX, ...old.map((e) => e.id));
  await redis("DEL", ...OLD_KEYS);
  const result = { converted: best.size, dropped: [...new Set(dropped)] };
  await redis("SET", DONE, JSON.stringify({ at: new Date().toISOString(), ...result }));
  done = true;
  return old.length ? result : null;
}
