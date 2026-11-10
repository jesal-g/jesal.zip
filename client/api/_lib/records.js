// Shape check for one stored problem record, so the API only ever saves clean data.
// Records are keyed by NeetCode slug: {id: "duplicate-integer", site: "neetcode", ...}.
// Problems NeetCode doesn't have (from before the switch) keep their LeetCode slug with
// site "leetcode".
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RESULTS = new Set(["fail", "hint", "ok"]);
export const SLUG = /^(?=.*[a-z])[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SITES = new Set(["neetcode", "leetcode"]);

export const validId = (id) => typeof id === "string" && id.length <= 120 && SLUG.test(id);

// `convert` turns an old LeetCode number into {id, site}; used for old backups.
export function cleanRecord(r, convert) {
  if (!r || typeof r !== "object") return null;
  let id = r.id;
  let site = r.site || "neetcode";
  if (id === undefined && r.num !== undefined && convert) {
    const num = Number(r.num);
    if (!Number.isInteger(num) || num < 1 || num > 99999) return null;
    ({ id, site } = convert(num));
  }
  if (!validId(id) || !SITES.has(site)) return null;
  if (!Array.isArray(r.attempts) || r.attempts.length === 0) return null;
  const attempts = r.attempts.slice(-40).map((a) => ({ date: a?.date, result: a?.result }));
  if (attempts.some((a) => !DATE.test(a.date) || !RESULTS.has(a.result))) return null;
  const stage = Number(r.stage);
  if (!Number.isInteger(stage) || stage < 0 || stage > 6) return null;
  const mastered = Boolean(r.mastered);
  const next = r.next ?? null;
  if (next !== null && !DATE.test(next)) return null;
  if (!mastered && next === null) return null;
  return {
    id,
    site,
    note: typeof r.note === "string" ? r.note.slice(0, 2000) : "",
    attempts,
    stage,
    next,
    mastered,
    added: DATE.test(r.added) ? r.added : attempts[0].date,
  };
}

const lastDate = (r) => r.attempts.at(-1)?.date || "";

// Two records for the same problem (an old LeetCode-numbered one and a NeetCode one):
// keep every distinct attempt, and the schedule and note of the more recently practiced one.
export function mergeRecords(a, b) {
  const [newer, older] = lastDate(a) >= lastDate(b) ? [a, b] : [b, a];
  const seen = new Set();
  const attempts = [...older.attempts, ...newer.attempts]
    .filter((x) => {
      const k = `${x.date}|${x.result}`;
      return seen.has(k) ? false : seen.add(k);
    })
    .sort((x, y) => x.date.localeCompare(y.date))
    .slice(-40);
  return {
    ...newer,
    note: newer.note || older.note,
    attempts,
    added: [a.added, b.added].sort()[0],
  };
}
