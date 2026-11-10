// One-time move from LeetCode numbers to NeetCode slugs.
// Before, problems were saved by LeetCode number and NeetCode solves had to be matched to
// one. Now everything is keyed by NeetCode slug. This converts the stored data once:
//   lc:problems  "217" -> record   becomes  "duplicate-integer" -> record
//   lc:inbox     one entry per NeetCode problem ("nc-<slug>" synced, "add-<slug>" added)
// A LeetCode number becomes a NeetCode slug from your old matches (lc:ncmap, kept read-only)
// or the NeetCode catalog. A problem NeetCode doesn't have keeps its LeetCode slug, with
// site "leetcode", so no rated problem is lost.
import { createRequire } from "node:module";
import { redis } from "./redis.js";
import { cleanRecord, mergeRecords, validId } from "./records.js";

export const PROBLEMS = "lc:problems";
export const INBOX = "lc:inbox";
const NCMAP = "lc:ncmap"; // old: NeetCode slug -> LeetCode number
const DONE = "lc:migrate:neetcode"; // set once the move is done

export async function readHash(key) {
  const flat = (await redis("HGETALL", key)) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

let tables = null;
function loadTables() {
  if (tables) return tables;
  const require = createRequire(import.meta.url);
  const nc = require("../../public/neetcode-catalog.json");
  const lc = require("../../public/leetcode-catalog.json");
  const lcSlug = new Map(lc.rows.map((r) => [r[0], r[2]]));
  const ncByNum = new Map();
  for (const [slug, , , , num] of nc.rows) {
    if (!num) continue;
    // Prefer NeetCode's renamed version (what its sync uses) over a copy under the LeetCode slug
    if (!ncByNum.has(num) || ncByNum.get(num) === lcSlug.get(num)) ncByNum.set(num, slug);
  }
  tables = { lcSlug, ncByNum };
  return tables;
}

// Returns num -> {id, site}
export async function makeConverter() {
  const t = loadTables();
  const matched = new Map();
  for (const [slug, num] of Object.entries(await readHash(NCMAP))) {
    if (validId(slug)) matched.set(Number(num), slug);
  }
  return (num) => {
    const slug = matched.get(num) || t.ncByNum.get(num);
    if (slug) return { id: slug, site: "neetcode" };
    return { id: t.lcSlug.get(num) || `leetcode-${num}`, site: "leetcode" };
  };
}

let done = false;

export async function migrate() {
  if (done) return;
  if (await redis("GET", DONE)) {
    done = true;
    return;
  }
  const convert = await makeConverter();
  const [rawProblems, rawInbox] = await Promise.all([readHash(PROBLEMS), readHash(INBOX)]);

  // Problems
  const kept = {}; // id -> record, for the ones already keyed by slug
  const legacy = []; // [field, record] saved by LeetCode number
  for (const [field, v] of Object.entries(rawProblems)) {
    try {
      const r = JSON.parse(v);
      if (r.id !== undefined) kept[field] = r;
      else legacy.push([field, r]);
    } catch {
      // leave a corrupt entry alone
    }
  }
  const moved = {}; // id -> record converted from a LeetCode number
  const oldFields = [];
  for (const [field, r] of legacy) {
    const clean = cleanRecord(r, convert);
    if (!clean) continue;
    oldFields.push(field);
    const other = moved[clean.id] || kept[clean.id];
    moved[clean.id] = other ? mergeRecords(other, clean) : clean;
  }
  const writes = Object.values(moved).flatMap((r) => [r.id, JSON.stringify(r)]);
  if (writes.length) await redis("HSET", PROBLEMS, ...writes);
  if (oldFields.length) await redis("HDEL", PROBLEMS, ...oldFields);

  // Inbox: one entry per problem, keeping the newest solve date
  const entries = {};
  const oldIds = [];
  for (const [id, v] of Object.entries(rawInbox)) {
    let e;
    try {
      e = JSON.parse(v);
    } catch {
      oldIds.push(id);
      continue;
    }
    if (/^(nc|add)-/.test(id) && e.slug) continue; // already new-style
    oldIds.push(id);
    let slug = e.slug;
    let site = "neetcode";
    if (e.source === "manual" && e.num) ({ id: slug, site } = convert(Number(e.num)));
    if (!validId(slug) || !e.at) continue;
    const key = `${e.source === "neetcode" ? "nc" : "add"}-${slug}`;
    if (!entries[key] || e.at > entries[key].at) {
      entries[key] = { id: key, slug, site, at: e.at, source: e.source === "neetcode" ? "neetcode" : "manual" };
    }
  }
  const inboxWrites = Object.values(entries).flatMap((e) => [e.id, JSON.stringify(e)]);
  if (inboxWrites.length) await redis("HSET", INBOX, ...inboxWrites);
  if (oldIds.length) await redis("HDEL", INBOX, ...oldIds);

  await redis(
    "SET",
    DONE,
    JSON.stringify({ at: new Date().toISOString(), problems: oldFields.length, inbox: oldIds.length })
  );
  done = true;
}
