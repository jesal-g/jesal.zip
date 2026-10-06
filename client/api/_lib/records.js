// Shape check for one stored problem record, so the API only ever saves clean data.
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RESULTS = new Set(["fail", "hint", "ok"]);

export function cleanRecord(r) {
  if (!r || typeof r !== "object") return null;
  const num = Number(r.num);
  if (!Number.isInteger(num) || num < 1 || num > 99999) return null;
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
    num,
    note: typeof r.note === "string" ? r.note.slice(0, 2000) : "",
    attempts,
    stage,
    next,
    mastered,
    added: DATE.test(r.added) ? r.added : attempts[0].date,
  };
}
